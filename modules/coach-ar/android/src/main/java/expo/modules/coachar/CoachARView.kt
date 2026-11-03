package expo.modules.coachar

import android.Manifest
import android.app.Activity
import android.app.Application
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.ImageFormat
import android.graphics.Matrix as ImageMatrix
import android.graphics.Rect
import android.graphics.YuvImage
import android.graphics.drawable.GradientDrawable
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.Image
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.opengl.Matrix
import android.os.SystemClock
import android.os.Bundle
import android.view.MotionEvent
import android.view.View
import android.widget.FrameLayout
import android.widget.TextView
import com.google.ar.core.Anchor
import com.google.ar.core.ArCoreApk
import com.google.ar.core.Config
import com.google.ar.core.DepthPoint
import com.google.ar.core.Frame
import com.google.ar.core.HitResult
import com.google.ar.core.Plane
import com.google.ar.core.Point
import com.google.ar.core.Session
import com.google.ar.core.TrackingState
import com.google.ar.core.exceptions.CameraNotAvailableException
import com.google.ar.core.exceptions.NotYetAvailableException
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicReference
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

/** Sesión local: ninguna imagen, pose o ancla se guarda en Firestore. */
class CoachARView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext), GLSurfaceView.Renderer, Application.ActivityLifecycleCallbacks {
  override val shouldUseAndroidLayout = true
  private val onEstado by EventDispatcher()
  private val surface = GLSurfaceView(context)
  private val contenedor = FrameLayout(context)
  private val etiqueta = TextView(context)
  private val fondo = FondoCamara()
  private val escritor = Executors.newSingleThreadExecutor()
  private val aplicacion = context.applicationContext as Application
  private val actividad = appContext.currentActivity
  private val capturaPendiente = AtomicReference<Promise?>(null)
  @Volatile private var sesion: Session? = null
  @Volatile private var ejecutando = false
  @Volatile private var destruida = false
  private var activa = false
  private var enPausa = false
  private var solicitarInstalacion = true
  private var sensorOrientacion = 90
  private var ancho = 1
  private var alto = 1
  private var ultimaProyeccion = 0L
  private var fondoDisponible = false
  @Volatile private var etiquetaOculta = true
  @Volatile private var versionObjetivo = 0
  private var versionEscena = 0
  private var ultimoEstado = ""
  private var objetivo: ObjetivoAR? = null // Solo GL salvo actualización con queueEvent.
  private var pendienteAnclaje = false
  private var toque: Pair<Float, Float>? = null
  private var ancla: Anchor? = null
  @Volatile private var captura: Captura? = null
  @Volatile private var archivo: File? = null

  private data class Captura(
    val id: String, val anclaCamara: Anchor, val ancho: Int, val alto: Int,
    val rotacion: Int, val focal: FloatArray, val principal: FloatArray, val instante: Long
  )

  init {
    surface.setEGLContextClientVersion(2)
    surface.preserveEGLContextOnPause = true
    surface.setRenderer(this)
    surface.renderMode = GLSurfaceView.RENDERMODE_CONTINUOUSLY
    contenedor.addView(surface, FrameLayout.LayoutParams(-1, -1))
    etiqueta.setTextColor(Color.WHITE)
    etiqueta.textSize = 16f
    etiqueta.maxWidth = (260 * resources.displayMetrics.density).toInt()
    etiqueta.setPadding(16, 12, 16, 12)
    etiqueta.background = GradientDrawable().apply {
      setColor(Color.argb(235, 16, 70, 55))
      cornerRadius = 16 * resources.displayMetrics.density
    }
    etiqueta.visibility = View.INVISIBLE
    etiqueta.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
    contenedor.addView(etiqueta, FrameLayout.LayoutParams(-2, -2))
    addView(contenedor, LayoutParams(-1, -1))
    aplicacion.registerActivityLifecycleCallbacks(this)
    surface.setOnTouchListener { _, event ->
      if (event.action == MotionEvent.ACTION_UP) {
        val punto = event.x to event.y
        surface.queueEvent { if (objetivo != null && ancla == null) toque = punto }
        surface.performClick()
      }
      true
    }
  }

  fun setActiva(valor: Boolean) {
    activa = valor
    if (valor) iniciar() else pausar()
  }

  fun setObjetivo(valor: ObjetivoAR?) {
    versionObjetivo += 1
    val version = versionObjetivo
    etiqueta.text = valor?.let { "● ${it.nombre.take(120)}\n${it.detalle.take(240)}" } ?: ""
    etiqueta.visibility = View.INVISIBLE
    surface.queueEvent {
      versionEscena = version
      ancla?.detach()
      ancla = null
      objetivo = valor
      etiquetaOculta = true
      pendienteAnclaje = valor != null
      toque = null
    }
  }

  fun recolocar() {
    versionObjetivo += 1
    val version = versionObjetivo
    etiqueta.visibility = View.INVISIBLE
    etiquetaOculta = true
    surface.queueEvent {
      versionEscena = version
      ancla?.detach()
      ancla = null
      pendienteAnclaje = false
      estado("colocar", "Toca una superficie junto a la máquina para colocar su información.")
    }
  }

  fun capturar(promise: Promise) {
    if (!ejecutando || destruida) {
      promise.reject("AR_NO_LISTO", "Espera a que la cámara AR esté lista.", null)
      return
    }
    if (!capturaPendiente.compareAndSet(null, promise)) {
      promise.reject("AR_OCUPADO", "Ya se está capturando una foto.", null)
      return
    }
    postDelayed({
      if (capturaPendiente.compareAndSet(promise, null))
        promise.reject("AR_SIN_SEGUIMIENTO", "Mueve lentamente el teléfono e inténtalo de nuevo.", null)
    }, 5000)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    iniciar()
  }

  override fun onDetachedFromWindow() {
    pausar()
    super.onDetachedFromWindow()
  }

  override fun onActivityResumed(activity: Activity) {
    if (activity === actividad) { enPausa = false; iniciar() }
  }
  override fun onActivityPaused(activity: Activity) {
    if (activity === actividad) { enPausa = true; pausar() }
  }
  override fun onActivityDestroyed(activity: Activity) {
    if (activity === actividad) dispose()
  }
  override fun onActivityCreated(activity: Activity, state: Bundle?) = Unit
  override fun onActivityStarted(activity: Activity) = Unit
  override fun onActivityStopped(activity: Activity) = Unit
  override fun onActivitySaveInstanceState(activity: Activity, state: Bundle) = Unit

  private fun iniciar() {
    if (!activa || enPausa || !isAttachedToWindow || destruida || ejecutando) return
    val activity = appContext.currentActivity ?: return
    if (context.checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
      estado("error", "Se necesita permiso de cámara para usar AR.")
      return
    }
    try {
      if (sesion == null) {
        if (ArCoreApk.getInstance().checkAvailability(context).isUnsupported) {
          estado("noCompatible", "Este teléfono no admite ARCore. Puedes usar la cámara sin AR.")
          return
        }
        if (ArCoreApk.getInstance().requestInstall(activity, solicitarInstalacion) ==
          ArCoreApk.InstallStatus.INSTALL_REQUESTED) {
          solicitarInstalacion = false
          estado("instalando", "Completa la instalación de Servicios de Google Play para RA.")
          return
        }
        val nueva = Session(context)
        try {
          nueva.configure(Config(nueva).apply {
            planeFindingMode = Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
            updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE
            if (nueva.isDepthModeSupported(Config.DepthMode.AUTOMATIC)) depthMode = Config.DepthMode.AUTOMATIC
          })
          val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
          sensorOrientacion = manager.getCameraCharacteristics(nueva.cameraConfig.cameraId)
            .get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 90
          sesion = nueva
        } catch (error: Exception) { nueva.close(); throw error }
      }
      sesion?.resume()
      ejecutando = true
      surface.onResume()
      estado("buscando", "Mueve lentamente el teléfono para detectar superficies cerca de la máquina.")
    } catch (error: Exception) {
      estado("error", "No se pudo iniciar ARCore. Comprueba los Servicios de Google Play para RA o usa la cámara sin AR.")
    }
  }

  private fun pausar() {
    if (!ejecutando) return
    ejecutando = false
    // Esperar primero al hilo GL: Session.update() nunca compite con pause/close.
    surface.onPause()
    sesion?.pause()
    ancla?.detach()
    ancla = null
    captura?.anclaCamara?.detach()
    captura = null
    pendienteAnclaje = false
    archivo?.delete()
    archivo = null
    capturaPendiente.getAndSet(null)?.reject("AR_PAUSADO", "La cámara se ha pausado.", null)
    etiqueta.visibility = View.INVISIBLE
  }

  fun dispose() {
    if (destruida) return
    pausar()
    destruida = true
    aplicacion.unregisterActivityLifecycleCallbacks(this)
    capturaPendiente.getAndSet(null)?.reject("AR_CERRADO", "Se cerró la cámara AR.", null)
    val cerrada = sesion
    sesion = null
    // close() puede tardar varios segundos: no bloquear el hilo de interfaz.
    escritor.execute { cerrada?.close() }
    escritor.shutdown()
    archivo?.delete()
  }

  override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
    fondoDisponible = false
    try {
      fondo.crear()
      fondoDisponible = true
    } catch (_: Exception) {
      estado("error", "No se pudo preparar la vista AR. Usa la cámara sin AR.")
    }
  }
  override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
    ancho = width; alto = height
    GLES20.glViewport(0, 0, width, height)
  }

  override fun onDrawFrame(gl: GL10?) {
    GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT or GLES20.GL_DEPTH_BUFFER_BIT)
    val actual = sesion ?: return
    if (!ejecutando || !fondoDisponible) return
    try {
      val rotacion = display?.rotation ?: 0
      actual.setDisplayGeometry(rotacion, ancho, alto)
      actual.setCameraTextureName(fondo.textura)
      val frame = actual.update()
      fondo.dibujar(frame)
      if (frame.camera.trackingState != TrackingState.TRACKING) {
        ocultarEtiqueta()
        estado("buscando", "Seguimiento pausado. Ilumina la zona y mueve lentamente el teléfono.")
        return
      }
      capturaPendiente.getAndSet(null)?.let { guardarCaptura(actual, frame, rotacion, it) }
      if (pendienteAnclaje) {
        pendienteAnclaje = false
        intentarAnclaje(frame)
      }
      toque?.let { punto ->
        toque = null
        colocar(frame.hitTest(punto.first, punto.second))
      }
      val actualAncla = ancla
      if (actualAncla != null && actualAncla.trackingState == TrackingState.TRACKING) {
        estado("anclada", "Información anclada. Puedes mover el teléfono alrededor de la máquina.")
        proyectar(frame, actualAncla)
      } else {
        ocultarEtiqueta()
        if (objetivo != null) estado("colocar", "Toca una superficie junto a la máquina para anclar su información.")
        else estado("lista", "Encuadra la máquina y toca el botón para identificarla.")
      }
    } catch (_: CameraNotAvailableException) {
      estado("error", "La cámara no está disponible. Cierra otras aplicaciones que la usen y vuelve a intentarlo.")
    } catch (_: Exception) {
      estado("error", "No se pudo actualizar la escena AR. Vuelve a abrir el escáner o usa la cámara sin AR.")
    }
  }

  private fun guardarCaptura(actual: Session, frame: Frame, rotacionPantalla: Int, promise: Promise) {
    try {
      frame.acquireCameraImage().use { image ->
        val datos = copiarNV21(image)
        val intrinsecos = frame.camera.imageIntrinsics
        val rotacion = (sensorOrientacion - rotacionPantalla * 90 + 360) % 360
        val nueva = Captura(UUID.randomUUID().toString(), actual.createAnchor(frame.camera.pose),
          image.width, image.height, rotacion, intrinsecos.focalLength, intrinsecos.principalPoint,
          SystemClock.elapsedRealtime())
        captura?.anclaCamara?.detach()
        captura = nueva
        escritor.execute {
          var salida: File? = null
          try {
            val jpeg = ByteArrayOutputStream()
            check(YuvImage(datos, ImageFormat.NV21, nueva.ancho, nueva.alto, null)
              .compressToJpeg(Rect(0, 0, nueva.ancho, nueva.alto), 90, jpeg))
            val bytes = jpeg.toByteArray()
            val bitmap = checkNotNull(BitmapFactory.decodeByteArray(bytes, 0, bytes.size))
            val orientada = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height,
              ImageMatrix().apply { postRotate(rotacion.toFloat()) }, true)
            salida = File(context.cacheDir, "coach-ar-${nueva.id}.jpg")
            try {
              salida.outputStream().use { check(orientada.compress(Bitmap.CompressFormat.JPEG, 85, it)) }
            } finally {
              if (orientada !== bitmap) orientada.recycle()
              bitmap.recycle()
            }
            val terminada = salida
            post {
              if (destruida || !ejecutando || captura?.id != nueva.id) {
                terminada.delete()
                promise.reject("AR_PAUSADO", "La captura ya no pertenece a la sesión activa.", null)
              } else {
                archivo?.delete()
                archivo = terminada
                promise.resolve(mapOf("uri" to android.net.Uri.fromFile(terminada).toString(), "capturaId" to nueva.id))
              }
            }
          } catch (_: Exception) {
            salida?.delete()
            promise.reject("AR_CAPTURA", "No se pudo guardar la captura AR. Inténtalo nuevamente.", null)
          }
        }
      }
    } catch (_: NotYetAvailableException) {
      promise.reject("AR_SIN_IMAGEN", "La cámara aún se está preparando. Inténtalo nuevamente.", null)
    } catch (_: Exception) {
      promise.reject("AR_CAPTURA", "No se pudo capturar la foto AR.", null)
    }
  }

  private fun intentarAnclaje(frame: Frame) {
    val objetivoActual = objetivo ?: return
    val foto = captura ?: return
    val x = objetivoActual.centroX?.toFloat() ?: return
    val y = objetivoActual.centroY?.toFloat() ?: return
    if (objetivoActual.capturaId != foto.id || SystemClock.elapsedRealtime() - foto.instante > 90000 ||
      foto.anclaCamara.trackingState != TrackingState.TRACKING) return
    val local = GeometriaAR.rayoSensor(x, y, foto.rotacion, foto.ancho, foto.alto,
      foto.focal[0], foto.focal[1], foto.principal[0], foto.principal[1])
    // El ancla temporal conserva la pose de captura aunque la respuesta llegue segundos después.
    val poseCaptura = foto.anclaCamara.pose
    colocar(frame.hitTest(poseCaptura.translation, 0, poseCaptura.rotateVector(local), 0))
  }

  private fun colocar(hits: List<HitResult>) {
    val hit = hits.firstOrNull {
      it.distance in 0.15f..8f && it.trackable.trackingState == TrackingState.TRACKING &&
        when (val trackable = it.trackable) {
          is Plane -> trackable.isPoseInPolygon(it.hitPose)
          is DepthPoint -> true
          is Point -> trackable.orientationMode == Point.OrientationMode.ESTIMATED_SURFACE_NORMAL
          else -> false
        }
    } ?: return
    ancla?.detach()
    ancla = hit.createAnchor()
    captura?.anclaCamara?.detach()
    captura = null
  }

  private fun proyectar(frame: Frame, actualAncla: Anchor) {
    val ahora = SystemClock.elapsedRealtime()
    if (ahora - ultimaProyeccion < 33) return
    ultimaProyeccion = ahora
    val vista = FloatArray(16)
    val proyeccion = FloatArray(16)
    val vp = FloatArray(16)
    val clip = FloatArray(4)
    frame.camera.getViewMatrix(vista, 0)
    frame.camera.getProjectionMatrix(proyeccion, 0, 0.1f, 100f)
    Matrix.multiplyMM(vp, 0, proyeccion, 0, vista, 0)
    val p = actualAncla.pose.translation
    Matrix.multiplyMV(clip, 0, vp, 0, floatArrayOf(p[0], p[1], p[2], 1f), 0)
    val visible = clip[3] > 0f && kotlin.math.abs(clip[0]) <= clip[3] && kotlin.math.abs(clip[1]) <= clip[3]
    if (!visible && etiquetaOculta) return
    etiquetaOculta = !visible
    val x = (clip[0] / clip[3] + 1f) * ancho / 2f
    val y = (1f - clip[1] / clip[3]) * alto / 2f
    val version = versionEscena
    post {
      if (version != versionObjetivo) return@post
      etiqueta.visibility = if (visible && ejecutando) View.VISIBLE else View.INVISIBLE
      if (visible) {
        etiqueta.translationX = (x - etiqueta.width / 2f).coerceIn(0f, (ancho - etiqueta.width).coerceAtLeast(0).toFloat())
        etiqueta.translationY = (y - etiqueta.height - 12f).coerceIn(0f, (alto - etiqueta.height).coerceAtLeast(0).toFloat())
      }
    }
  }

  private fun estado(codigo: String, mensaje: String) {
    synchronized(this) {
      if (ultimoEstado == codigo) return
      ultimoEstado = codigo
    }
    post { if (!destruida) onEstado(mapOf("estado" to codigo, "mensaje" to mensaje)) }
  }

  private fun ocultarEtiqueta() {
    if (etiquetaOculta) return
    etiquetaOculta = true
    post { etiqueta.visibility = View.INVISIBLE }
  }

  private fun copiarNV21(image: Image): ByteArray {
    require(image.format == ImageFormat.YUV_420_888)
    val salida = ByteArray(image.width * image.height * 3 / 2)
    var indice = 0
    val y = image.planes[0]
    for (fila in 0 until image.height) for (columna in 0 until image.width)
      salida[indice++] = y.buffer.get(y.buffer.position() + fila * y.rowStride + columna * y.pixelStride)
    val u = image.planes[1]; val v = image.planes[2]
    for (fila in 0 until image.height / 2) for (columna in 0 until image.width / 2) {
      salida[indice++] = v.buffer.get(v.buffer.position() + fila * v.rowStride + columna * v.pixelStride)
      salida[indice++] = u.buffer.get(u.buffer.position() + fila * u.rowStride + columna * u.pixelStride)
    }
    return salida
  }
}
