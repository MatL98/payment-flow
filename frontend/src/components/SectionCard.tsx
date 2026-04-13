import { PropsWithChildren } from "react";

interface SectionCardProps extends PropsWithChildren {
  title: string;
  subtitle: string;
}

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

