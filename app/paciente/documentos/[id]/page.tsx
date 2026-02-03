import { DocumentoClient } from "./documento-client"

export default function DocumentoPage({ params }: { params: { id: string } }) {
  return <DocumentoClient id={params.id} />
}
