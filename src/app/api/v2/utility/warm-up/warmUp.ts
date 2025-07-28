import { cookiesClient } from "@/utilities/amplify-utils";
import getClientAuthType from "@/utilities/clientAuthType";


const client = cookiesClient;

const warmUp = async () => {
    const authMode = await getClientAuthType()
    const vainId = await client.queries.vainId({ warmup: true }, { authMode });
    return vainId;
}

export default warmUp;
