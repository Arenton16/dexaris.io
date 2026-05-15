interface Props {
  onDismiss: () => void;
}

export default function NewsBanner({ onDismiss }: Props) {
  return (
    <div className="news-banner">
      <p className="news-banner-text">
        Stay ahead of the market — get the best DeFi yields delivered to your inbox
      </p>
      <a
        className="news-banner-btn"
        href="https://dexaris-newsletter.beehiiv.com/subscribe"
        target="_blank"
        rel="noopener noreferrer"
      >
        Subscribe free
      </a>
      <button className="news-banner-close" onClick={onDismiss} aria-label="Dismiss banner">
        ×
      </button>
    </div>
  );
}
