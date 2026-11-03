package expo.modules.coachar

import android.opengl.GLES11Ext
import android.opengl.GLES20
import com.google.ar.core.Coordinates2d
import com.google.ar.core.Frame
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Textura OES de ARCore; sin una segunda sesión CameraX/expo-camera. */
internal class FondoCamara {
  var textura = 0
    private set
  private var programa = 0
  private var posicion = 0
  private var coordenada = 0
  private val vertices = buffer(floatArrayOf(-1f, -1f, 1f, -1f, -1f, 1f, 1f, 1f))
  private val uv = buffer(FloatArray(8))

  fun crear() {
    val texturas = IntArray(1)
    GLES20.glGenTextures(1, texturas, 0)
    textura = texturas[0]
    GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, textura)
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
    GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)
    val vertex = shader(GLES20.GL_VERTEX_SHADER, """
      attribute vec2 aPosition;
      attribute vec2 aUV;
      varying vec2 vUV;
      void main() { gl_Position = vec4(aPosition, 0.0, 1.0); vUV = aUV; }
    """.trimIndent())
    val fragment = shader(GLES20.GL_FRAGMENT_SHADER, """
      #extension GL_OES_EGL_image_external : require
      precision mediump float;
      uniform samplerExternalOES uCamera;
      varying vec2 vUV;
      void main() { gl_FragColor = texture2D(uCamera, vUV); }
    """.trimIndent())
    programa = GLES20.glCreateProgram()
    GLES20.glAttachShader(programa, vertex)
    GLES20.glAttachShader(programa, fragment)
    GLES20.glLinkProgram(programa)
    val estado = IntArray(1)
    GLES20.glGetProgramiv(programa, GLES20.GL_LINK_STATUS, estado, 0)
    check(estado[0] == GLES20.GL_TRUE) { "No se pudo crear el fondo AR" }
    GLES20.glDeleteShader(vertex)
    GLES20.glDeleteShader(fragment)
    posicion = GLES20.glGetAttribLocation(programa, "aPosition")
    coordenada = GLES20.glGetAttribLocation(programa, "aUV")
  }

  fun dibujar(frame: Frame) {
    if (frame.timestamp == 0L) return
    vertices.position(0)
    uv.position(0)
    frame.transformCoordinates2d(Coordinates2d.OPENGL_NORMALIZED_DEVICE_COORDINATES,
      vertices, Coordinates2d.TEXTURE_NORMALIZED, uv)
    vertices.position(0)
    uv.position(0)
    GLES20.glDisable(GLES20.GL_DEPTH_TEST)
    GLES20.glUseProgram(programa)
    GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
    GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, textura)
    GLES20.glUniform1i(GLES20.glGetUniformLocation(programa, "uCamera"), 0)
    GLES20.glVertexAttribPointer(posicion, 2, GLES20.GL_FLOAT, false, 0, vertices)
    GLES20.glVertexAttribPointer(coordenada, 2, GLES20.GL_FLOAT, false, 0, uv)
    GLES20.glEnableVertexAttribArray(posicion)
    GLES20.glEnableVertexAttribArray(coordenada)
    GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
    GLES20.glDisableVertexAttribArray(posicion)
    GLES20.glDisableVertexAttribArray(coordenada)
  }

  private fun shader(tipo: Int, codigo: String): Int {
    val id = GLES20.glCreateShader(tipo)
    GLES20.glShaderSource(id, codigo)
    GLES20.glCompileShader(id)
    val estado = IntArray(1)
    GLES20.glGetShaderiv(id, GLES20.GL_COMPILE_STATUS, estado, 0)
    check(estado[0] == GLES20.GL_TRUE) { "No se pudo compilar el fondo AR" }
    return id
  }

  private fun buffer(valores: FloatArray) = ByteBuffer.allocateDirect(valores.size * 4)
    .order(ByteOrder.nativeOrder()).asFloatBuffer().apply { put(valores); position(0) }
}
