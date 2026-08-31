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
        <div className="mt-[22px] text-[13px] text-footerMuted">© 2026 · A personal library, not a review site</div>
      </div>
    </footer>
  );
}
