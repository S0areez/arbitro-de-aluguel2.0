import { Star } from "lucide-react";

export const RatingStars = ({ rating, size = 16, color = "#FFD700" }: { rating: number; size?: number; color?: string }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          style={{ color: i <= Math.round(rating) ? color : undefined }}
          className={i <= Math.round(rating) ? "fill-current" : "text-muted-foreground/30"}
        />
      ))}
      <span className="ml-1 text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
    </div>
  );
};
