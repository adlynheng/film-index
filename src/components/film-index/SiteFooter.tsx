// TMDB's attribution terms require both the logo and the wording below on any
// product that reads from their API, which this one does for title metadata.
const TMDB_LOGO_SRC = "/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg";

export function SiteFooter() {
  return (
    <footer className="-mx-[40px] mt-[150px] grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] items-start gap-x-[60px] gap-y-[48px] bg-footer px-[40px] pb-[60px] pt-[74px] text-footerText">
      <div className="max-w-[420px]">
        <div className="text-[12px] uppercase tracking-[0.12em] text-footerMuted">About this index</div>
        <p className="mt-[16px] text-[15px] leading-[1.55] text-pretty text-footerBody">
          I build small projects like this one as creative expression — a place to practise craft outside of a brief.
          I&rsquo;m an aspiring design engineer, equally interested in how a thing looks and how it&rsquo;s put together.
        </p>
        {/* TODO: replace with your real portfolio URL */}
        <a
          href="#"
          className="mt-[20px] inline-block border-b border-paper pb-px text-[15px] text-paper hover:border-footerLinkHover hover:text-footerLinkHover"
        >
          View my portfolio
        </a>
      </div>
      <div>
        <div className="text-[12px] uppercase tracking-[0.12em] text-footerMuted">Get in touch</div>
        <div className="mt-[16px] flex flex-col items-start gap-[11px] text-[15px]">
          {/* TODO: replace with your real LinkedIn URL and email address */}
          <a href="https://www.linkedin.com/in/adlyn-heng/" target="_blank" rel="noopener noreferrer" className="border-b border-footerBorder pb-px text-footerText hover:border-paper hover:text-paper">
            LinkedIn
          </a>
          <a
            href="mailto:adlynheng@gmail.com"
            className="border-b border-footerBorder pb-px text-footerText hover:border-paper hover:text-paper"
          >
            Email me
          </a>
        </div>
      </div>
      <div>
        <div className="text-[12px] uppercase tracking-[0.12em] text-footerMuted">Credits</div>
        <p className="mt-[16px] text-[15px] leading-[1.55] text-pretty text-footerBody">
          Film stills courtesy of{" "}
          <a href="https://film-grab.com" className="border-b border-footerBorder text-paper">
            Film-Grab
          </a>
          , an archive of frames from cinema. All frames remain the property of their respective copyright holders.
        </p>
        <p className="mt-[16px] text-[15px] leading-[1.55] text-pretty text-footerBody">
          Film and series details — titles, years, directors and cast — come from{" "}
          <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="border-b border-footerBorder text-paper">
            TMDB
          </a>
          . This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="mt-[20px] inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- local static SVG, no optimisation to gain */}
          <img src={TMDB_LOGO_SRC} alt="The Movie Database (TMDB)" width={124} height={16} className="h-[16px] w-auto" />
        </a>
        <div className="mt-[22px] text-[13px] text-footerMuted">© 2026 · A personal library, not a review site</div>
      </div>
    </footer>
  );
}
