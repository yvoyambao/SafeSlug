import { useState } from 'react'

function CommentSection({ comments = [], onAddComment }) {
  const [message, setMessage] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return

    onAddComment(trimmed)
    setMessage('')
  }

  return (
    <section className="panel comment-section">
      <div className="panel-title-row">
        <div>
          <h3>Community comments</h3>
          <p className="panel-note">Add local context or follow-up details for this incident.</p>
        </div>
      </div>

      <div className="comment-list">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <article key={comment.id} className="comment-item">
              <div>
                <strong>{comment.author}</strong>
                <span>{comment.time}</span>
              </div>
              <p>{comment.message}</p>
            </article>
          ))
        ) : (
          <div className="empty-comments">No comments yet. Be the first to add local insight.</div>
        )}
      </div>

      <form className="comment-form" onSubmit={handleSubmit}>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Add your comment"
          rows={3}
        />
        <button type="submit" className="btn btn-secondary">
          Post comment
        </button>
      </form>
    </section>
  )
}

export default CommentSection
