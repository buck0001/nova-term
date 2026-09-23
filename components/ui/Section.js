export default function Section({ title, description, actions, children, className = "" }) {
  return (
    <section className={`ui-section ${className}`.trim()}>
      {(title || description || actions) && (
        <div className="ui-section-header">
          <div>
            {title && <h2 className="ui-section-title">{title}</h2>}
            {description && <p className="ui-section-description">{description}</p>}
          </div>
          {actions && <div className="ui-section-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
