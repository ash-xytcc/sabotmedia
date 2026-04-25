import { Link } from 'react-router-dom'
import { buildLocalAnalytics } from '../lib/localAnalytics'

function MonthlyViewsGraph({ points }) {
  const width = 640
  const height = 210
  const minX = 20
  const maxX = width - 20
  const minY = 24
  const maxY = height - 32
  const maxViews = Math.max(...points.map((point) => point.views), 1)

  const pathData = points
    .map((point, index) => {
      const x = minX + ((maxX - minX) * index) / (points.length - 1 || 1)
      const y = maxY - ((maxY - minY) * point.views) / maxViews
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <div className="wp-analytics-graph" role="img" aria-label="Monthly local demo views graph">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <line x1={minX} y1={maxY} x2={maxX} y2={maxY} className="wp-analytics-graph__axis" />
        <path d={pathData} className="wp-analytics-graph__line" />
      </svg>
      <div className="wp-analytics-graph__labels">
        {points.map((point) => (
          <span key={point.key}>{point.label}</span>
        ))}
      </div>
    </div>
  )
}

export function WpAnalyticsWidgets({ pieces = [], compact = false }) {
  const analytics = buildLocalAnalytics(pieces)

  return (
    <section className="wp-dashboard-grid wp-dashboard-grid--analytics">
      <article className="wp-meta-box wp-meta-box--stat">
        <h2>Views Today</h2>
        <p className="wp-metric">{analytics.viewsToday.toLocaleString()}</p>
      </article>

      <article className="wp-meta-box wp-meta-box--stat">
        <h2>Visitors Today</h2>
        <p className="wp-metric">{analytics.visitorsToday.toLocaleString()}</p>
      </article>

      <article className="wp-meta-box wp-meta-box--stat">
        <h2>Comments</h2>
        <p className="wp-metric">{analytics.comments.toLocaleString()}</p>
      </article>

      <article className="wp-meta-box wp-meta-box--stat">
        <h2>Published Posts</h2>
        <p className="wp-metric">{analytics.publishedPosts.toLocaleString()}</p>
      </article>

      <article className="wp-meta-box wp-meta-box--wide">
        <h2>Top Posts</h2>
        {analytics.topPosts.length ? (
          <ol className="wp-analytics-list">
            {analytics.topPosts.map((post) => (
              <li key={post.slug}>
                <Link to={`/post/${post.slug}`}>{post.title}</Link>
                <strong>{post.views.toLocaleString()} views</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p>No published posts available for ranking yet.</p>
        )}
      </article>

      <article className="wp-meta-box wp-meta-box--wide">
        <h2>Monthly Views</h2>
        <MonthlyViewsGraph points={analytics.monthlyViews} />
      </article>

      {!compact ? (
        <article className="wp-meta-box wp-meta-box--wide wp-meta-box--notice">
          <h2>Data Source</h2>
          <p>
            Local demo analytics generated from existing content metadata. This is intentionally mock data and does not represent real server analytics.
          </p>
        </article>
      ) : null}
    </section>
  )
}
