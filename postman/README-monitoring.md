# API health checks and monitoring

## What was added

- Backend health endpoint at `/api/health`
- Postman collection: `API Health Checks`
- Local environment with `baseUrl = http://localhost:5000/api`

## Health endpoint response

The backend now responds to:

- `GET http://localhost:5000/api/health`

It returns JSON with:

- `status`
- `service`
- `timestamp`
- `uptime`
- `database.status`
- `database.readyState`

If MongoDB is connected, the endpoint returns `200` with `status: "ok"`.
If MongoDB is not connected, it returns `503` with `status: "degraded"`.

## Run locally in Postman

1. Start the backend from the `backend` folder.
2. Open the `Local` environment.
3. Open the `API Health` request in the `API Health Checks` collection.
4. Send the request.
5. Confirm the tests pass.

## Run from the command line

You can also run the collection with the Postman CLI after logging in.

Example shape:

```powershell
postman collection run <collection-id> -e <environment-id>
```

Or pass the variable directly:

```powershell
postman collection run <collection-id> --env-var "baseUrl=http://localhost:5000/api"
```

## Set up scheduled monitoring

For recurring cloud monitoring in Postman:

1. Open the `API Health Checks` collection.
2. Choose **Run collection**.
3. Choose **Schedule Run** or create a **Monitor**.
4. Select the environment that contains shared values.
5. Set the frequency, timezone, and notifications.
6. Save and activate the schedule.

## Important monitor note

Cloud monitors use shared environment values, not local values. If you schedule this in Postman cloud monitoring, make sure the environment value for `baseUrl` is stored as a shared value and points to a reachable URL.

If your API is only available on `localhost`, a cloud monitor will not be able to reach it. In that case, use a deployed URL or run checks locally with the Postman CLI.
