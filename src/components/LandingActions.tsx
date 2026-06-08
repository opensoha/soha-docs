import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function LandingActions() {
  const {siteConfig} = useDocusaurusContext();
  const cloudLoginUrl = siteConfig.customFields?.cloudLoginUrl;
  const hasCloudLogin = typeof cloudLoginUrl === 'string' && cloudLoginUrl.length > 0;

  return (
    <div className="soha-landing-actions">
      <Link className="soha-landing-button soha-landing-buttonPrimary" to="/self-hosted/">
        部署自托管
      </Link>
      {hasCloudLogin ? (
        <a
          className="soha-landing-button soha-landing-buttonCloud"
          href={cloudLoginUrl}
          rel="noreferrer"
          target="_blank"
        >
          进入 Soha Cloud
        </a>
      ) : (
        <Link className="soha-landing-button soha-landing-buttonCloud" to="/cloud/">
          Soha Cloud 入口
        </Link>
      )}
      <Link className="soha-landing-button soha-landing-buttonSecondary" to="/api/contracts/">
        查看 Contracts
      </Link>
    </div>
  );
}
