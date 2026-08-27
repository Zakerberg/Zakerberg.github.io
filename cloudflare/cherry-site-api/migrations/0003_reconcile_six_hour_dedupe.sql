DELETE FROM visits AS older
WHERE EXISTS (
  SELECT 1
  FROM visits AS newer
  WHERE newer.ip_hash = older.ip_hash
    AND newer.visited_at >= older.visited_at
    AND newer.visited_at - older.visited_at <= 21600
    AND (
      newer.visited_at > older.visited_at
      OR (newer.visited_at = older.visited_at AND newer.id > older.id)
    )
);
