(() => {
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.remove('waiting');observer.unobserve(entry.target);}},{threshold:.08});
  document.querySelectorAll('.film-reveal').forEach(node=>{node.classList.add('waiting');observer.observe(node);});
  // Keep the full story visible if observation fails or the tab is restored.
  setTimeout(()=>document.querySelectorAll('.waiting').forEach(n=>n.classList.remove('waiting')),7000);
})();
