# trello-webhook-client

Basic Trello webhook client to dump Trello webhook requests.

App contains following callback endpoints for Trello webhooks:

* `POST /api/trello/webhooks/masterlist` - Master list. Used for creating a master list of all lists on different cards identified by list name. Example use: You want master shopping list from all "Shopping"
 checklists from different cards.
* `POST /api/trello/webhooks/debug` - Debug. Logs all incoming messages.

## Deploying to Heroku

For this to run on Heroku, you need following environment variables to be set:

* `HOST` - `0.0.0.0`
* `TRUST_PROXY` - `true`

## Resources

* Trello REST API intro - https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/
* Trello REST API docs - https://developer.atlassian.com/cloud/trello/rest/api-group-actions/
* Trello REST API - checkListItem modification - https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-checkitem-idcheckitem-put
