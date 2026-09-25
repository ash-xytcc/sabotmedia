import { Link } from 'react-router-dom'
import { PublicationTopbar } from './PublicationTopbar'
import { PublicationFooter } from './PublicationFooter'
import './courses-page.css'

const COURSE_PATH = '/guides/become-the-thousand-servers/'

export function CoursesPage() {
  return (
    <>
      <PublicationTopbar />
      <main className="courses-page" aria-labelledby="courses-title">
        <header className="courses-page__intro">
          <p className="courses-page__eyebrow">Sabot Media · Learn together</p>
          <h1 id="courses-title">Courses</h1>
          <p className="courses-page__lede">
            Practical, self-paced courses for keeping community media and infrastructure in our own hands.
            Read, try things out, and pass what you learn along.
          </p>
        </header>

        <section className="courses-page__list" aria-labelledby="courses-featured-title">
          <article className="course-feature">
            <Link className="course-feature__image-link" to={COURSE_PATH} aria-label="Open Become the Thousand Servers">
              <img
                className="course-feature__image"
                src="/images/courses/become-the-thousand-servers.png"
                alt="Black-and-white illustration of a many-armed octopus tending server equipment, with the words ‘Become the Thousand Servers’ and ‘Each one teach one.’"
              />
            </Link>
            <div className="course-feature__copy">
              <p className="course-feature__eyebrow">Featured course · 12 lessons</p>
              <h2 id="courses-featured-title">Become the Thousand Servers</h2>
              <p className="course-feature__subtitle">A self-paced field course in autonomous infrastructure</p>
              <p>
                Learn to map the services a project depends on, host and move a small website, make backups you can
                restore, and share the knowledge so no one person has to hold it all.
              </p>
              <p className="course-feature__note">No account required. Your progress stays in this browser.</p>
              <Link className="course-feature__action" to={COURSE_PATH}>Start the course <span aria-hidden="true">→</span></Link>
            </div>
          </article>
        </section>

        <p className="courses-page__closing">More courses will be added here as they are ready.</p>
      </main>
      <PublicationFooter />
    </>
  )
}
