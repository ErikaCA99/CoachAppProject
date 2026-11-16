package expo.modules.coachar

/** Matemática pura: el JPEG está orientado, los intrínsecos son del sensor. */
internal object GeometriaAR {
  fun rayoSensor(
    x: Float, y: Float, rotacion: Int, ancho: Int, alto: Int,
    fx: Float, fy: Float, cx: Float, cy: Float
  ): FloatArray {
    require(x.isFinite() && y.isFinite() && x in 0f..1f && y in 0f..1f)
    require(ancho > 0 && alto > 0 && fx > 0f && fy > 0f)
    require(listOf(fx, fy, cx, cy).all { it.isFinite() })
    val (u, v) = when (rotacion) {
      0 -> x to y
      90 -> y to (1f - x)
      180 -> (1f - x) to (1f - y)
      270 -> (1f - y) to x
      else -> error("Rotación de cámara inválida")
    }
    // ARCore: +X derecha, +Y arriba, la cámara mira hacia -Z.
    return floatArrayOf((u * ancho - cx) / fx, -(v * alto - cy) / fy, -1f)
  }
}
