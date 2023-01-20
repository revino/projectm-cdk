
import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { ApiProps, makeIntegration } from '../stacks/ApiGatewayStack';
import { Integration, IntegrationType } from 'aws-cdk-lib/aws-apigateway';

export class UserApi extends Stack{

  constructor(scope: Construct, id: string, props: ApiProps){
    super(scope, id, props.stackProps);

    /*
    const loadbalancer = props.loadbalancer;
    const vpclink = props.vpclink;
     
    const root = props.api.root;
    const userResource = root.addResource('user');
    const userLoginResource = userResource.addResource('login');
    const userChannelResource = userResource.addResource('channel');

    //oauth
    root.addResource('oauth2').addResource('authorize').addResource('google').addMethod('GET', makeIntegration({
      method: 'GET',
      url: 'oauth2/authorize/google',
      vpclink, loadbalancer,
    }));
    root.addResource('login').addResource('oauth2').addResource('code').addResource('google').addMethod('GET', makeIntegration({
      method: 'GET',
      url: 'login/oauth2/code/google',
      vpclink, loadbalancer,
    }));
    
    //user
    userResource.addMethod('GET', makeIntegration({
      method: 'GET',
      url: 'user',
      vpclink, loadbalancer,
    }));

    userResource.addMethod('POST', makeIntegration({
      method: 'POST',
      url: 'user',
      vpclink, loadbalancer,
    }));
    
    //user/login
    userLoginResource.addMethod('POST', makeIntegration({
      method: 'POST',
      url: 'user/login',
      vpclink, loadbalancer,
    }));
    
    //user/channel
    
    userChannelResource.addProxy({anyMethod: false}).addMethod('PUT', new Integration({
      type: IntegrationType.HTTP_PROXY,
      integrationHttpMethod: 'PUT'
    }));
    */
  }
  
}