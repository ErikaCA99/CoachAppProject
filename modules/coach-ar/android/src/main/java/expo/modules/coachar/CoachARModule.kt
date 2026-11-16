package expo.modules.coachar

import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class ObjetivoAR : Record {
  @Field var clave: String = ""
  @Field var capturaId: String? = null
  @Field var centroX: Double? = null
  @Field var centroY: Double? = null
  @Field var nombre: String = ""
  @Field var detalle: String = ""
}

class CoachARModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CoachAR")

    View(CoachARView::class) {
      Events("onEstado")
      Prop("activa") { view: CoachARView, activa: Boolean -> view.setActiva(activa) }
      Prop("objetivo") { view: CoachARView, objetivo: ObjetivoAR? -> view.setObjetivo(objetivo) }
      AsyncFunction("capturar") { view: CoachARView, promise: Promise ->
        view.capturar(promise)
      }.runOnQueue(Queues.MAIN)
      AsyncFunction("recolocar") { view: CoachARView -> view.recolocar() }
        .runOnQueue(Queues.MAIN)
      OnViewDestroys { view: CoachARView -> view.dispose() }
    }
  }
}
