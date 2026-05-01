type ClampMenuPositionArgs = {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  padding?: number;
};

export const clampMenuPosition = ({
  x,
  y,
  width,
  height,
  viewportWidth,
  viewportHeight,
  padding = 10,
}: ClampMenuPositionArgs) => {
  const maxX = Math.max(padding, viewportWidth - width - padding);
  const maxY = Math.max(padding, viewportHeight - height - padding);

  return {
    x: Math.min(Math.max(x, padding), maxX),
    y: Math.min(Math.max(y, padding), maxY),
  };
};
