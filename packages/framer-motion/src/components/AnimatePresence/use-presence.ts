import { useCallback, useContext, useEffect, useId } from "react"
import {
    PresenceContext,
    PresenceContextProps,
} from "../../context/PresenceContext"

export type SafeToRemove = () => void

type AlwaysPresent = [true, null]

type Present = [true]

type NotPresent = [false, SafeToRemove]

/**
 * When a component is the child of `AnimatePresence`, it can use `usePresence`
 * to access information about whether it's still present in the React tree.
 *
 * ```jsx
 * import { usePresence } from "framer-motion"
 *
 * export const Component = () => {
 *   const [isPresent, safeToRemove] = usePresence()
 *
 *   useEffect(() => {
 *     !isPresent && setTimeout(safeToRemove, 1000)
 *   }, [isPresent])
 *
 *   return <div />
 * }
 * ```
 *
 * If `isPresent` is `false`, it means that a component has been removed the tree, but
 * `AnimatePresence` won't really remove it until `safeToRemove` has been called.
 *
 * @public
 */
export function usePresence(
    subscribe: boolean = true
): AlwaysPresent | Present | NotPresent {
    const context = useContext(PresenceContext)

    if (context === null) return [true, null]

    const { isPresent, onExitComplete, register } = context

    // It's safe to call the following hooks conditionally (after an early return) because the context will always
    // either be null or non-null for the lifespan of the component.

    const id = useId()
    useEffect(() => {
        if (subscribe) register(id)
    }, [subscribe])

    const safeToRemove = useCallback(
        () => subscribe && onExitComplete && onExitComplete(id),
        [id, onExitComplete, subscribe]
    )

    return !isPresent && onExitComplete ? [false, safeToRemove] : [true]
}

/**
 * Similar to `usePresence`, except `useIsPresent` simply returns whether or not the component is present.
 * There is no `safeToRemove` function.
 *
 * ```jsx
 * import { useIsPresent } from "framer-motion"
 *
 * export const Component = () => {
 *   const isPresent = useIsPresent()
 *
 *   useEffect(() => {
 *     !isPresent && console.log("I've been removed!")
 *   }, [isPresent])
 *
 *   return <div />
 * }
 * ```
 *
 * @public
 */
export function useIsPresent() {
    return isPresent(useContext(PresenceContext))
}

export function isPresent(context: PresenceContextProps | null) {
    return context === null ? true : context.isPresent
}
