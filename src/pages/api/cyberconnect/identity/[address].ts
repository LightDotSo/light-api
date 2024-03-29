import { fetchCyberconnectIdentity } from "@lightdotso/services";
import type { CyberConnectIdentity } from "@lightdotso/types";
import {
  cyberconnectIdentityQuerySchema,
  cyberconnectIdentitySchema,
} from "@lightdotso/types";
import type { NextApiHandler } from "next";

import { apiHandler } from "@lightdotso/api/utils/apiHandler";
import { validator } from "@lightdotso/api/utils/validator";

const getHandler: NextApiHandler = async (req, res) => {
  const { address } = validator(cyberconnectIdentityQuerySchema, req.query);
  const result = await fetchCyberconnectIdentity(address);
  const safeResult: CyberConnectIdentity = validator(
    cyberconnectIdentitySchema,
    result,
  );
  res.json(safeResult);
};

export const identity = apiHandler({
  GET: getHandler,
});

export default identity;
