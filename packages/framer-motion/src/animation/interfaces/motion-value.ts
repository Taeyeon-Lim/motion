import type { MotionValue, StartAnimation } from "motion-dom"
import {
    AnimationPlaybackControls,
    frame,
    getValueTransition,
    GroupPlaybackControls,
    ValueAnimationOptions,
} from "motion-dom"
import { MotionGlobalConfig, secondsToMilliseconds } from "motion-utils"
import type { UnresolvedKeyframes } from "../../render/utils/KeyframesResolver"
import type { VisualElement } from "../../render/VisualElement"
import { Transition } from "../../types"
import { instantAnimationState } from "../../utils/use-instant-transition-state"
import { AcceleratedAnimation } from "../animators/AcceleratedAnimation"
import { MainThreadAnimation } from "../animators/MainThreadAnimation"
import { getFinalKeyframe } from "../animators/waapi/utils/get-final-keyframe"
import { getDefaultTransition } from "../utils/default-transitions"
import { isTransitionDefined } from "../utils/is-transition-defined"

export const animateMotionValue =
    <V extends string | number>(
        name: string,
        value: MotionValue<V>,
        target: V | UnresolvedKeyframes<V>,
        transition: Transition & { elapsed?: number } = {},
        element?: VisualElement<any>,
        isHandoff?: boolean
    ): StartAnimation =>
    (onComplete): AnimationPlaybackControls => {
        const valueTransition = getValueTransition(transition, name) || {}

        /**
         * Most transition values are currently completely overwritten by value-specific
         * transitions. In the future it'd be nicer to blend these transitions. But for now
         * delay actually does inherit from the root transition if not value-specific.
         */
        const delay = valueTransition.delay || transition.delay || 0

        /**
         * Elapsed isn't a public transition option but can be passed through from
         * optimized appear effects in milliseconds.
         */
        let { elapsed = 0 } = transition
        elapsed = elapsed - secondsToMilliseconds(delay)

        let options: ValueAnimationOptions = {
            keyframes: Array.isArray(target) ? target : [null, target],
            ease: "easeOut",
            velocity: value.getVelocity(),
            ...valueTransition,
            delay: -elapsed,
            onUpdate: (v) => {
                value.set(v)
                valueTransition.onUpdate && valueTransition.onUpdate(v)
            },
            onComplete: () => {
                onComplete()
                valueTransition.onComplete && valueTransition.onComplete()
            },
            name,
            motionValue: value,
            element: isHandoff ? undefined : element,
        }

        /**
         * If there's no transition defined for this value, we can generate
         * unique transition settings for this value.
         */
        if (!isTransitionDefined(valueTransition)) {
            options = {
                ...options,
                ...getDefaultTransition(name, options),
            }
        }

        /**
         * Both WAAPI and our internal animation functions use durations
         * as defined by milliseconds, while our external API defines them
         * as seconds.
         */
        if (options.duration) {
            options.duration = secondsToMilliseconds(options.duration)
        }
        if (options.repeatDelay) {
            options.repeatDelay = secondsToMilliseconds(options.repeatDelay)
        }

        if (options.from !== undefined) {
            options.keyframes[0] = options.from
        }

        let shouldSkip = false

        if (
            (options as any).type === false ||
            (options.duration === 0 && !options.repeatDelay)
        ) {
            options.duration = 0

            if (options.delay === 0) {
                shouldSkip = true
            }
        }

        if (
            instantAnimationState.current ||
            MotionGlobalConfig.skipAnimations
        ) {
            shouldSkip = true
            options.duration = 0
            options.delay = 0
        }

        /**
         * If the transition type or easing has been explicitly set by the user
         * then we don't want to allow flattening the animation.
         */
        options.allowFlatten = !valueTransition.type && !valueTransition.ease

        /**
         * If we can or must skip creating the animation, and apply only
         * the final keyframe, do so. We also check once keyframes are resolved but
         * this early check prevents the need to create an animation at all.
         */
        if (shouldSkip && !isHandoff && value.get() !== undefined) {
            const finalKeyframe = getFinalKeyframe<V>(
                options.keyframes as V[],
                valueTransition
            )

            if (finalKeyframe !== undefined) {
                frame.update(() => {
                    options.onUpdate!(finalKeyframe)
                    options.onComplete!()
                })

                // We still want to return some animation controls here rather
                // than returning undefined
                return new GroupPlaybackControls([])
            }
        }

        /**
         * Animate via WAAPI if possible. If this is a handoff animation, the optimised animation will be running via
         * WAAPI. Therefore, this animation must be JS to ensure it runs "under" the
         * optimised animation.
         */
        if (!isHandoff && AcceleratedAnimation.supports(options)) {
            return new AcceleratedAnimation(options)
        } else {
            return new MainThreadAnimation(options)
        }
    }
