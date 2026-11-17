// Short reminder shown with financial guidance inside the app.
export function AdviceNote({ top = 22 }: { top?: number }) {
  return (
    <p style={{ marginTop: top, fontSize: 11.5, color: "var(--mute)", lineHeight: 1.5, maxWidth: 760 }}>
      Suggestions only. These figures and recommendations are planning aids based on what you enter. They are not financial, tax, legal or other professional advice and
      do not replace your accountant, bookkeeper or other qualified professional.
    </p>
  );
}
