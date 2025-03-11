export { recordStats, statsBuffer } from "motion-dom"
export { calcBoxDelta } from "./projection/geometry/delta-calc"
export { nodeGroup } from "./projection/node/group"
export { HTMLProjectionNode } from "./projection/node/HTMLProjectionNode"
export { correctBorderRadius } from "./projection/styles/scale-border-radius"
export { correctBoxShadow } from "./projection/styles/scale-box-shadow"
export { addScaleCorrector } from "./projection/styles/scale-correction"
export { HTMLVisualElement } from "./render/html/HTMLVisualElement"
export { buildTransform } from "./render/html/utils/build-transform"
export { animateValue as animate, frame, frameData, mix }
import { frame, frameData } from "motion-dom"
import { animateValue } from "./animation/animators/MainThreadAnimation"
import { mix } from "./utils/mix"
