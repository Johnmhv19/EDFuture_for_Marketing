import './globals.css';

export const metadata = {
  title: 'YCYW Advanced Pathways Academy — Programmes for Marketing',
  description: 'Programme catalogue, recap videos, photos, articles, and resources for the marketing team.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
