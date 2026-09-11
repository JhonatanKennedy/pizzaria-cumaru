const BUTTON_VARIANTS = ['primary', 'secondary', 'outline'] as const;

export type TButtonVariant = (typeof BUTTON_VARIANTS)[number];

const VARIANT_CLASSES: Record<TButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: TButtonVariant;
}

export function Button({
  children,
  className = '',
  type = 'button',
  variant = 'primary',
  ...rest
}: ButtonProps): React.ReactNode {
  return (
    <button
      type={type}
      className={`${VARIANT_CLASSES[variant]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
