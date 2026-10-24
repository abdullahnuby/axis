import { useId } from "react";

/** AXIS orbital mark. The small-symbol component is used in headers, app icons and subtle watermarks. */
export function AxisLogoMark({ className, title = "AXIS" }: { className?: string; title?: string }) {
  const uid = useId().replace(/:/g, "");
  const blue = `${uid}-blue`;
  const teal = `${uid}-teal`;
  const eye = `${uid}-eye`;
  return (
    <svg className={className} viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={title} focusable="false" fill="none">
      <defs>
        <linearGradient id={blue} x1="28" y1="30" x2="121" y2="125" gradientUnits="userSpaceOnUse"><stop stopColor="#45B7FF"/><stop offset=".48" stopColor="#007BFF"/><stop offset="1" stopColor="#075CBF"/></linearGradient>
        <linearGradient id={teal} x1="22" y1="98" x2="123" y2="43" gradientUnits="userSpaceOnUse"><stop stopColor="#007BFF"/><stop offset=".54" stopColor="#00C4CC"/><stop offset="1" stopColor="#35D5B0"/></linearGradient>
        <linearGradient id={eye} x1="59" y1="65" x2="82" y2="86" gradientUnits="userSpaceOnUse"><stop stopColor="#25BFEF"/><stop offset="1" stopColor="#007BFF"/></linearGradient>
      </defs>
      <path d="M31 111 58.7 50.5c6-13.2 17.7-17.2 26.3-2.7l30.8 57.3" stroke={`url(#${blue})`} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M29.9 101.3c-10.2 6.1-10.8 17.3-2.2 23.7 8.2 6.1 19.5.4 29.5-11.6-10.6 2.9-20.2-1.3-27.3-12.1Z" fill={`url(#${blue})`}/>
      <circle cx="69.8" cy="74.7" r="10.6" fill={`url(#${eye})`}/>
      <path d="M20.8 94.1c12.6 18 37.2 13.5 61.4-7.1 19.8-16.8 34.1-34.2 32.2-48.5" stroke={`url(#${teal})`} strokeWidth="8.5" strokeLinecap="round"/>
      <path d="M88.7 89.6c10.7 11.8 22.5 22.8 31.4 18.1 5.8-3.1 6.1-9.2 2.2-15.2" stroke={`url(#${teal})`} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="116.9" cy="37.8" r="8.2" fill="#20CDBD"/><circle cx="114.1" cy="35.1" r="2.2" fill="#72E7D5" opacity=".86"/>
    </svg>
  );
}
