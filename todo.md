- [ ] Driver Availability deployed via ECS
  - [ ] Redis instance deployed via SCS
  - [ ] Publishing and subscribing to MQ driver profile events
- [x] MQ deployed
- [x] getProfileLambda deployed
  - [x] Consuming driver profile events
  - [x] Publishing driver profile events
- [ ] notificationLambda deployed
  - ...

Final test:

```
Given a driver registers as available
When a rider books a ride
Then the driver gets notified that a rider is waiting
When the rider accepts this ride
Then the driver gets notified that the ride is accepted
And so does the rider
```

As an extension, switching the lambda to publish images to ECR and pulling the
image to use in lambdas would be a better idea while zipping is being a pain.