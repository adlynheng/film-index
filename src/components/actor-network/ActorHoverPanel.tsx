import type { ActorNode } from "@/lib/network/actorGraph";

interface ActorHoverPanelProps {
  node: ActorNode;
  collaboratorCount: number;
}

export function ActorHoverPanel({ node, collaboratorCount }: ActorHoverPanelProps) {
  return (
    <div className="pointer-events-none absolute right-[40px] top-[28px] z-10 w-[270px] border border-networkBorder bg-network px-[22px] pb-[20px] pt-[22px]">
      <div className="text-[22px] font-medium leading-[1.1] tracking-[-0.02em]">{node.name}</div>
      <div className="mt-[8px] text-[13px] text-muted">
        {node.films.length} {node.films.length === 1 ? "film" : "films"} in the index · {collaboratorCount}{" "}
        {collaboratorCount === 1 ? "collaborator" : "collaborators"}
      </div>
      <div className="mb-[12px] mt-[16px] h-px bg-edgeFaint" />
      <ul className="flex flex-col">
        {node.films.map((filmTitle, index) => (
          <li key={`${filmTitle}-${index}`} className="py-[5px] text-[14px]">
            {filmTitle}
          </li>
        ))}
      </ul>
    </div>
  );
}
