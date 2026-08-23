/* The .msg banner from portal.css. Renders nothing when there's no text. */
export default function Msg({ text, kind = 'error' }) {
  if (!text) return null;
  return <div className={`msg show ${kind}`}>{text}</div>;
}
