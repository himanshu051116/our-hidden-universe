import { useOutletContext } from 'react-router-dom';
import OpenWhenPanel from '../components/OpenWhenPanel.jsx';

export default function UniverseOpenWhen() {
  const { resetVersion } = useOutletContext();
  return <OpenWhenPanel key={`open-when-${resetVersion}`} />;
}
