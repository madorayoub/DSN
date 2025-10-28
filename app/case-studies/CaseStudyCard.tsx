import styles from "./case-studies.module.css";
import type { CardCaseStudy } from "./CaseStudiesClient";

type CaseStudyCardProps = {
  card: CardCaseStudy;
  variant?: "grid" | "carousel";
  role?: string;
};

const CaseStudyCard = ({ card, variant = "grid", role }: CaseStudyCardProps) => {
  const WrapperElement = card.href ? "a" : "div";
  const wrapperProps: Record<string, unknown> = card.href
    ? {
        href: card.href,
        className: styles.cardLink,
      }
    : {
        className: styles.cardLink,
        role: "group" as const,
        "aria-label": card.title,
      };

  return (
    <article
      className={`${styles.card} ${variant === "carousel" ? styles.cardCompact : ""}`.trim()}
      role={role}
      id={card.id}
    >
      <WrapperElement {...wrapperProps}>
        <span className={styles.cardThumb} aria-hidden="true">
          <img src={card.thumbnail} alt={`${card.title} thumbnail`} loading="lazy" />
        </span>
        <span className={styles.cardBody}>
          <span className={styles.cardEyebrow}>{`${card.client} · ${card.industry}`}</span>
          <span className={styles.cardTitle}>{card.title}</span>
          <span className={styles.cardSummary}>{card.summary}</span>
          <span className={styles.tagList} aria-label="Case study tags">
            {card.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </span>
        </span>
      </WrapperElement>
    </article>
  );
};

export default CaseStudyCard;
