export type PortalBounds = { left: number; top: number; width: number; height: number };

/** Nine stationary touch targets; shader deformation never changes their geometry. */
export function getHubLayout(width: number, height: number) {
  const compact = height < 260 && width > 480;
  let size = Math.max(44, Math.min(112, width * .19, height * .19));
  const labelHeight = 28;
  function positions(diameter: number): PortalBounds[] {
    if (compact) return Array.from({ length: 9 }, (_, index) => {
      const row = index < 5 ? 0 : 1, col = row === 0 ? index : index - 5, count = row === 0 ? 5 : 4;
      return { left: width * ((col + .5) / count) - diameter / 2, top: row === 0 ? 4 : height - diameter - labelHeight - 4, width: diameter, height: diameter + labelHeight };
    });
    if (height < 400 && width < 480) {
      const compactPositions = [[.20, 8], [.50, 8], [.80, 8], [.92, height*.35], [.92, height*.60], [.67, height-diameter-labelHeight-4], [.33, height-diameter-labelHeight-4], [.08, height*.60], [.08, height*.35]];
      return compactPositions.map(([x,y]) => ({ left: Math.max(4,Math.min(width-diameter-4,width*x-diameter/2)), top: y, width: diameter, height: diameter+labelHeight }));
    }
    const rx = (width-diameter)/2-12, ry = (height-diameter-labelHeight)/2-12;
    return Array.from({ length: 9 }, (_, index) => {
      const angle = -Math.PI/2 + index*Math.PI*2/9;
      return { left: width/2 + Math.cos(angle)*rx-diameter/2, top: (height-labelHeight)/2 + Math.sin(angle)*ry-diameter/2, width: diameter, height: diameter+labelHeight };
    });
  }
  const intersects = (a: PortalBounds, b: PortalBounds) => a.left < b.left+b.width+3 && a.left+a.width+3 > b.left && a.top < b.top+b.height+3 && a.top+a.height+3 > b.top;
  let portals = positions(size);
  while (size > 44 && portals.some((a,i) => portals.some((b,j) => j > i && intersects(a,b)))) { size = Math.max(44, size-1); portals = positions(size); }
  return { size, portals, guardianSize: Math.min(230, width*.40, height*(compact ? .32 : .36)), centerX: width/2, centerY: (height-labelHeight)/2 };
}
