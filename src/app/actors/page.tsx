import type { Metadata } from "next";
import { ActorNetworkCanvas } from "@/components/actor-network/ActorNetworkCanvas";
import { fetchActorGraph } from "@/lib/db/graph";
import { layoutActorGraph } from "@/lib/network/layout";

// The graph is queried per request. Without this the route prerenders at build
// time, which both freezes the network at whatever the database held during the
// build and makes the build itself require DATABASE_URL.
export const dynamic = "force-dynamic";

export default async function ActorsPage() {
  const graph = await fetchActorGraph();
  return <ActorNetworkCanvas graph={layoutActorGraph(graph)} />;
}
