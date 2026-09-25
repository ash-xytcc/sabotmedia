import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import './courses-index.css'

const COURSE_URL = '/guides/become-the-thousand-servers/'
const OFFLINE_URL = '/guides/become-the-thousand-servers/offline'
const FEATURE_IMAGE = '/images/courses/become-the-thousand-servers.png'

export function CoursesIndexPage() {
  return (
    <main className="page courses-page">
      <PublicationTopbar />
      <section className="courses-hero">
        <p className="courses-hero__eyebrow">Sabot Media / Guides</p>
        <h1>Guides</h1>
        <p>Self-directed field courses built to be used, broken, repaired, printed, shared, and taught forward. No account required to start.</p>
      </section>

      <section className="courses-list" aria-label="Guides">
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
