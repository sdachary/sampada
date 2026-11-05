// Skeleton primitive: matches final layout dimensions to prevent CLS; opacity pulse
// (no gradient — gradient constraint). style drives the shape, e.g. {width:200,height:14}.
export default function Skeleton({ className = '', style, ...props } = {}) {
  return <div className={`skeleton ${className}`.trim()} style={style} {...props} aria-hidden="true" />
}
