export default /* glsl */`
uniform vec3 diffuse;
uniform float opacity;

uniform float outlineThickness;
uniform vec2 resolution;

#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {

	#include <clipping_planes_fragment>

	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );

	#include <logdepthbuf_fragment>
	
	#ifdef USE_MAP
		vec4 texelColor = texture2D( map, vUv );
		texelColor = mapTexelToLinear( texelColor );

		if ( texelColor.a > 0.0 ) {
			vec2 texel = vec2(1.0 / resolution.x, 1.0 / resolution.y);

			float alphaUp = texture2D( map, vUv + texel * vec2( 0, 1 ) * outlineThickness ).a;
       		float alphaDown = texture2D( map, vUv + texel * vec2( 0, - 1 ) * outlineThickness ).a;
       		float alphaRight = texture2D( map, vUv + texel * vec2( 1, 0 ) * outlineThickness ).a;
       		float alphaLeft = texture2D( map, vUv + texel * vec2( - 1, 0 ) * outlineThickness ).a;

			float a = alphaUp * alphaDown * alphaRight * alphaLeft;

       		vec3 finalColor = mix( diffuse, texelColor.rgb, a );
       		texelColor.rgb = finalColor;
		}
		diffuseColor *= texelColor;
	#endif

	#include <alphamap_fragment>
	#include <alphatest_fragment>

	outgoingLight = diffuseColor.rgb;

	gl_FragColor = vec4( outgoingLight, diffuseColor.a );

	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
}
`;