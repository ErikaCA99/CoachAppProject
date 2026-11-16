package expo.modules.coachar

import org.junit.Assert.assertArrayEquals
import org.junit.Test

class GeometriaARTest {
  private fun rayo(x: Float, y: Float, rotacion: Int) =
    GeometriaAR.rayoSensor(x, y, rotacion, 640, 480, 400f, 400f, 320f, 240f)

  @Test fun centroMiraHaciaMenosZEnTodasLasOrientaciones() {
    for (rotacion in listOf(0, 90, 180, 270))
      assertArrayEquals(floatArrayOf(0f, 0f, -1f), rayo(0.5f, 0.5f, rotacion), 0.00001f)
  }

  @Test fun invierteRotacionDelJpegAntesDeUsarIntrinsecos() {
    assertArrayEquals(floatArrayOf(-0.8f, 0.6f, -1f), rayo(0f, 0f, 0), 0.00001f)
    assertArrayEquals(floatArrayOf(-0.8f, -0.6f, -1f), rayo(0f, 0f, 90), 0.00001f)
    assertArrayEquals(floatArrayOf(0.8f, -0.6f, -1f), rayo(0f, 0f, 180), 0.00001f)
    assertArrayEquals(floatArrayOf(0.8f, 0.6f, -1f), rayo(0f, 0f, 270), 0.00001f)
  }

  @Test fun noAsumeQueElPuntoPrincipalEsElCentro() {
    val resultado = GeometriaAR.rayoSensor(0.5f, 0.5f, 0, 640, 480, 400f, 300f, 300f, 210f)
    assertArrayEquals(floatArrayOf(0.05f, -0.1f, -1f), resultado, 0.00001f)
  }

  @Test(expected = IllegalArgumentException::class)
  fun rechazaCoordenadasFueraDeLaImagen() { rayo(1.2f, 0.5f, 0) }

  @Test(expected = IllegalArgumentException::class)
  fun rechazaCoordenadasNoFinitas() { rayo(Float.NaN, 0.5f, 0) }
}
