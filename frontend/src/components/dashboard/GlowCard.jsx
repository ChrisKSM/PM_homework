import { Card, CardContent } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';

export default function GlowCard({ children, glowColor = '#00d4ff', sx = {}, animate = true, ...props }) {
  const Wrapper = animate ? motion.div : 'div';
  const wrapperProps = animate
    ? { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } }
    : {};

  return (
    <Wrapper {...wrapperProps} style={{ height: '100%' }}>
      <Card
        sx={{
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            padding: '1px',
            background: `linear-gradient(135deg, ${alpha(glowColor, 0.4)}, transparent 60%)`,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          },
          ...sx,
        }}
        {...props}
      >
        <CardContent sx={{ p: 2.5, height: '100%', '&:last-child': { pb: 2.5 } }}>
          {children}
        </CardContent>
      </Card>
    </Wrapper>
  );
}
