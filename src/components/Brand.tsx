const logoPath = '/assets/learnlld-logo.png'

export default function Brand() {
  return (
    <a className="brand" href="/" aria-label="LearnLLD home">
      <img className="brand-logo" src={logoPath} alt="" />
      <span>LearnLLD</span>
    </a>
  )
}
