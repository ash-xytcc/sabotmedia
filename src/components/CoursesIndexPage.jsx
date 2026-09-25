import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'

const COURSE_URL = '/guides/become-the-thousand-servers/'
const OFFLINE_URL = '/guides/become-the-thousand-servers/offline'
const FEATURE_IMAGE = '/media/courses/each-one-teach-one.webp'

export function CoursesIndexPage() {
  return (
    <main className="page courses-page">
      <style>{`
        .courses-page{min-height:100vh;background:var(--paper,#f3efe3);color:var(--ink,#171717)}
        .courses-hero{max-width:1180px;margin:0 auto;padding:clamp(2rem,5vw,5rem) clamp(1rem,4vw,2.5rem) 1.5rem;border-bottom:3px solid currentColor}
        .courses-hero__eyebrow,.course-feature__kicker,.course-feature__meta{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;text-transform:uppercase;letter-spacing:.04em;font-weight:700}
        .courses-hero__eyebrow{margin:0 0 .75rem;font-size:.8rem}
        .courses-hero h1{margin:0;font-size:clamp(3.25rem,10vw,8rem);line-height:.85;text-transform:uppercase;letter-spacing:-.055em}
        .courses-hero>p:last-child{max-width:760px;margin:1.35rem 0 0;font-size:clamp(1.05rem,2vw,1.35rem);line-height:1.45}
        .courses-list{max-width:1180px;margin:0 auto;padding:clamp(1.5rem,4vw,3.5rem) clamp(1rem,4vw,2.5rem) clamp(3rem,7vw,6rem)}
        .course-feature{display:grid;grid-template-columns:minmax(260px,480px) minmax(0,1fr);gap:clamp(1.5rem,4vw,4rem);align-items:start}
        .course-feature__image{display:block;border:3px solid currentColor;background:#fff}
        .course-feature__image img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover}
        .course-feature__body{padding-top:.25rem}
        .course-feature__kicker{margin:0 0 1rem;font-size:.78rem}
        .course-feature h2{margin:0;font-size:clamp(2.25rem,5vw,5rem);line-height:.92;letter-spacing:-.045em}
        .course-feature h2 a{color:inherit;text-decoration-thickness:.06em;text-underline-offset:.08em}
        .course-feature__deck{margin:1.2rem 0;font-size:clamp(1.25rem,2vw,1.7rem);font-weight:700;line-height:1.25}
        .course-feature__body>p:not(.course-feature__kicker):not(.course-feature__deck):not(.course-feature__meta){max-width:690px;font-size:1.05rem;line-height:1.6}
        .course-feature__meta{margin:1.5rem 0;padding:.8rem 0;border-top:1px solid currentColor;border-bottom:1px solid currentColor;font-size:.78rem;line-height:1.5}
        .course-feature__actions{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center}
        .course-feature__button,.course-feature__secondary{display:inline-block;padding:.8rem 1rem;border:2px solid currentColor;color:inherit;font-weight:800;text-transform:uppercase;text-decoration:none}
        .course-feature__button{background:#171717;color:#fff}
        .course-feature__button:hover,.course-feature__button:focus-visible{background:transparent;color:inherit}
        .course-feature__secondary:hover,.course-feature__secondary:focus-visible{background:#171717;color:#fff}
        @media(max-width:760px){.course-feature{grid-template-columns:1fr}.course-feature__image{width:min(100%,480px)}.courses-hero h1{font-size:clamp(3rem,18vw,5rem)}}
      `}</style>

      <PublicationTopbar />
      <section className="courses-hero">
        <p className="courses-hero__eyebrow">Sabot Media / Courses</p>
        <h1>Courses</h1>
        <p>Self-directed field courses built to be used, broken, repaired, printed, shared, and taught forward. No account required to start.</p>
      </section>

      <section className="courses-list" aria-label="Courses">
        <article className="course-feature">
          <a className="course-feature__image" href={COURSE_URL}>
            <img
              src={FEATURE_IMAGE}
              alt="Black-and-white DIY zine poster for Become the Thousand Servers: an octopus wraps around server racks beneath an Each One, Teach One banner while an astronaut floats among cables and radio towers."
            />
          </a>
          <div className="course-feature__body">
            <p className="course-feature__kicker">Featured course · autonomous movement infrastructure</p>
            <h2><a href={COURSE_URL}>Become the Thousand Servers</a></h2>
            <p className="course-feature__deck">A field guide to autonomous movement infrastructure.</p>
            <p>Learn to map dependencies, read DNS, use SSH, put something online, inspect what you exposed, make and restore backups, rebuild and migrate services, distribute administration, preserve published work, troubleshoot networks, and teach the next person.</p>
            <p className="course-feature__meta">13 sections · 12 practical lessons · roughly 14–30 hours · no account required</p>
            <div className="course-feature__actions">
              <a className="course-feature__button" href={COURSE_URL}>Start the course</a>
              <a className="course-feature__secondary" href={OFFLINE_URL}>Reading / print edition</a>
            </div>
          </div>
        </article>
      </section>
      <PublicationFooter />
    </main>
  )
}
