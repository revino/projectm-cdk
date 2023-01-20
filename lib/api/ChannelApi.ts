
import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { ApiProps, makeIntegration } from '../stacks/ApiGatewayStack';
import { ConnectionType, Integration, IntegrationType } from 'aws-cdk-lib/aws-apigateway';

export class ChannelApi extends Stack{

  constructor(scope: Construct, id: string, props: ApiProps){
    super(scope, id, props.stackProps);
/*
    const loadbalancer = props.loadbalancer;
    const vpclink = props.vpclink;
     
    const root = props.api.root;
    const channelResource = root.addResource('channel');
    
    //channel
    channelResource.addMethod('POST', makeIntegration({
      method: 'POST',
      url: 'channel',
      vpclink, loadbalancer,
    }));
    
    //channel/{id}
    const channelId = channelResource.addResource('{id}')
    channelId.addMethod('GET', makeIntegration({
      method: 'GET',
      url: 'channel/{id}',
      vpclink, loadbalancer,
    }));
    channelId.addMethod('PUT', makeIntegration({
      method: 'PUT',
      url: 'channel/{id}',
      vpclink, loadbalancer,
    }));
    channelId.addMethod('DELETE', makeIntegration({
      method: 'DELETE',
      url: 'channel/{id}',
      vpclink, loadbalancer,
    }));

    //channel/sub/{id}
    channelResource.addResource('sub').addResource('{id}').addMethod('PUT', makeIntegration({
      method: 'PUT',
      url: 'channel/sub/{id}',
      vpclink, loadbalancer,
    }));

    //channel/unsub/{id}
    channelResource.addResource('unsub').addResource('{id}').addMethod('PUT', makeIntegration({
      method: 'PUT',
      url: 'channel/unsub/{id}',
      vpclink, loadbalancer,
    }));
  */
  }
  
}