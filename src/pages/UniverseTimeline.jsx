import { useOutletContext } from 'react-router-dom';
import TimelinePanel from '../components/TimelinePanel.jsx';

export default function UniverseTimeline() {
  const { resetVersion } = useOutletContext();
  return <TimelinePanel key={`timeline-${resetVersion}`} />;
}
