interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function Button({
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps): React.ReactNode {
  return (
    <button type={type} className={`btn-primary ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
