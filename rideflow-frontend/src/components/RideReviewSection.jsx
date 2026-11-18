import { useCallback, useEffect, useRef, useState } from "react";
import { Star, LoaderCircle, MessageSquare } from "lucide-react";

import api from "../api/axiosInstance";
import "./RideReviewSection.css";

const REVIEW_API = "/reviews";
const MAX_COMMENT_LENGTH = 1000;

const RATING_LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

function getErrorMessage(err, fallback) {
  return (
    err.response?.data?.message ||
    err.response?.data?.error ||
    fallback
  );
}

function formatReviewDate(date) {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StarRow({ value, size = 18 }) {
  return (
    <div
      className="ride-review-stars-static"
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= value
              ? "ride-review-star filled"
              : "ride-review-star"
          }
          fill={star <= value ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

function RideReviewSection({ rideId, driverName }) {
  const [review, setReview] = useState(null);
  const [checking, setChecking] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Check whether this ride already has a review.
  // A 404 from the backend simply means "no review yet".
  const loadReview = useCallback(async () => {
    setChecking(true);
    setLoadError("");

    try {
      const response = await api.get(
        `${REVIEW_API}/rides/${rideId}`
      );

      if (mountedRef.current) {
        setReview(response.data);
      }
    } catch (err) {
      if (!mountedRef.current) return;

      if (err.response?.status === 404) {
        setReview(null);
      } else {
        setLoadError(
          getErrorMessage(err, "Unable to load the review.")
        );
      }
    } finally {
      if (mountedRef.current) {
        setChecking(false);
      }
    }
  }, [rideId]);

  useEffect(() => {
    loadReview();
  }, [loadReview]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setSubmitError("");

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setSubmitError("Please choose a star rating from 1 to 5.");
      return;
    }

    if (comment.trim().length > MAX_COMMENT_LENGTH) {
      setSubmitError(
        `Feedback cannot exceed ${MAX_COMMENT_LENGTH} characters.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post(
        `${REVIEW_API}/rides/${rideId}`,
        {
          rating,
          comment: comment.trim() || null,
        }
      );

      if (!mountedRef.current) return;

      setReview(response.data);
    } catch (err) {
      if (!mountedRef.current) return;

      setSubmitError(
        getErrorMessage(
          err,
          "Unable to submit your review. Please try again."
        )
      );

      // 409 = a review already exists, so load and show it.
      if (err.response?.status === 409) {
        await loadReview();
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  // 1) Checking for an existing review
  if (checking) {
    return (
      <div className="ride-review ride-review-muted">
        <LoaderCircle size={15} className="ride-review-spin" />
        <span>Checking review...</span>
      </div>
    );
  }

  // 2) Could not load (not a 404)
  if (loadError) {
    return (
      <div className="ride-review">
        <p className="ride-review-error">{loadError}</p>

        <button
          type="button"
          className="ride-review-link-button"
          onClick={loadReview}
        >
          Try again
        </button>
      </div>
    );
  }

  // 3) Review already submitted: show it (no form, so no duplicates)
  if (review) {
    const reviewDate = formatReviewDate(review.createdAt);

    return (
      <div className="ride-review">
        <div className="ride-review-header">
          <strong>Your review</strong>

          {reviewDate && (
            <small className="ride-review-date">{reviewDate}</small>
          )}
        </div>

        <div className="ride-review-summary">
          <StarRow value={review.rating} />

          <span className="ride-review-rating-label">
            {review.rating}/5 · {RATING_LABELS[review.rating] || ""}
          </span>
        </div>

        {review.comment ? (
          <p className="ride-review-comment">
            <MessageSquare size={14} />
            <span>{review.comment}</span>
          </p>
        ) : (
          <p className="ride-review-no-comment">
            No written feedback.
          </p>
        )}
      </div>
    );
  }

  // 4) No review yet: show the rating form
  const activeRating = hoverRating || rating;

  return (
    <form className="ride-review" onSubmit={handleSubmit}>
      <div className="ride-review-header">
        <strong>
          Rate {driverName ? driverName : "your driver"}
        </strong>
      </div>

      <div
        className="ride-review-stars"
        role="radiogroup"
        aria-label="Ride rating"
        onMouseLeave={() => setHoverRating(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            className={`ride-review-star-button ${
              star <= activeRating ? "active" : ""
            }`}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            disabled={submitting}
          >
            <Star
              size={26}
              fill={star <= activeRating ? "currentColor" : "none"}
            />
          </button>
        ))}

        <span className="ride-review-rating-label">
          {activeRating ? RATING_LABELS[activeRating] : "Tap a star"}
        </span>
      </div>

      <textarea
        className="ride-review-textarea"
        placeholder="Share your feedback (optional)"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={MAX_COMMENT_LENGTH}
        rows={3}
        disabled={submitting}
      />

      <div className="ride-review-footer">
        <small className="ride-review-counter">
          {comment.length}/{MAX_COMMENT_LENGTH}
        </small>

        <button
          type="submit"
          className="ride-review-submit"
          disabled={submitting || rating === 0}
        >
          {submitting ? (
            <>
              <LoaderCircle size={15} className="ride-review-spin" />
              Submitting...
            </>
          ) : (
            "Submit review"
          )}
        </button>
      </div>

      {submitError && (
        <p className="ride-review-error">{submitError}</p>
      )}
    </form>
  );
}

export default RideReviewSection;