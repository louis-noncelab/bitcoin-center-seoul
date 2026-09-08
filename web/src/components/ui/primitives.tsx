import type { ComponentPropsWithRef, ReactNode } from "react";

type ActionVariant = "primary" | "secondary" | "quiet";

type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ActionVariant;
};

export function Button({
  variant = "primary",
  type = "button",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`button ${className}`}
      data-variant={variant}
      {...props}
    />
  );
}

type ActionLinkProps = ComponentPropsWithRef<"a"> & {
  variant?: ActionVariant;
};

export function ActionLink({
  variant = "primary",
  className = "",
  ...props
}: ActionLinkProps) {
  return (
    <a className={`button ${className}`} data-variant={variant} {...props} />
  );
}

export function SectionFrame({
  id,
  titleId,
  children,
}: {
  id: string;
  titleId: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={titleId} className="section-frame">
      {children}
    </section>
  );
}

export function MediaFrame({
  ratio = "landscape",
  children,
  caption,
}: {
  ratio?: "wide" | "landscape" | "portrait";
  children: ReactNode;
  caption: ReactNode;
}) {
  return (
    <figure className="media-frame" data-ratio={ratio}>
      <div className="media-frame__viewport">{children}</div>
      <figcaption className="media-frame__caption">{caption}</figcaption>
    </figure>
  );
}
