import { useOutletContext } from 'react-router-dom';
import SharedNightSky from '../components/SharedNightSky.jsx';

export default function UniverseSky() {
  const { resetVersion } = useOutletContext();
  return <SharedNightSky key={`night-sky-${resetVersion}`} />;
}
