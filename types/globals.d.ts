export { }

declare global {
    interface CustomJwtSessionClaims {
        metadata: {
            onboardingComplete?: boolean
            role?: string
        }
    }

    // Allow Google Maps Places web component in JSX
    namespace JSX {
        interface IntrinsicElements {
            'gmp-place-autocomplete': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                'component-restrictions'?: string
                placeholder?: string
                style?: React.CSSProperties
            }
        }
    }
}
