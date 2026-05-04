import { useState } from 'react';

export function DataNotes() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <span className="text-sm font-medium text-amber-900">
          About the data — a note from the newsletter author
        </span>
        <svg
          className={`w-4 h-4 text-amber-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-4 text-sm text-amber-900 space-y-3 leading-relaxed border-t border-amber-200 pt-3">
          <p>
            The overall sample is large and robust. That said, some limitations warrant acknowledgement.
            The dataset does not comprise the entire universe of official Chinese rhetoric towards the
            United States throughout the period analysed. It is drawn from the coverage in the{' '}
            <a
              href="https://trackingpeoplesdaily.substack.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-700"
            >
              Tracking People's Daily
            </a>{' '}
            newsletter, which introduces certain selection biases. Given the newsletter's purpose — to
            focus on the most significant developments and important policy signals — pieces that are
            anodyne, repeat simplistic official lines, or offer overly optimistic framing tend to get
            filtered out.
          </p>
          <p>
            Repetition may be overrepresented. In response to major developments, the{' '}
            <em>People's Daily</em> often covers statements from multiple Party or state departments,
            each repeating the same central line as a bureaucratic imperative. Some of this repetition
            may skew findings, though there are likely not enough such instances to have a statistically
            significant impact.
          </p>
          <p>
            Finally, the <em>People's Daily</em> does not cover all utterances from the Ministry of
            Foreign Affairs' daily press conferences, even those relating to the US. Only at certain
            moments and during key events does the paper highlight what the ministry has said. One should
            therefore assume that the ministry has expressed far more views, cooperative and
            confrontational alike, than what the database captures.
          </p>
          <p className="text-xs text-amber-700 italic">— Manoj Kewalramani</p>
        </div>
      )}
    </div>
  );
}
