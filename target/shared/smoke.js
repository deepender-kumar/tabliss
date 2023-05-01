//We are loading the Three.js library from the cdn here: https://cdnjs.com/libraries/three.js/
var scene;
var camera;
var renderer;

const width = 80;
const height = 140;

const fShader = `
  uniform vec2 res;//The width and height of our screen
        uniform sampler2D bufferTexture;//Our input texture
        uniform vec3 smokeSource;//The x,y are the posiiton. The z is the power/density
        uniform float time;
        void main() {
              vec2 pixel = gl_FragCoord.xy / res.xy;
              //Get the distance of the current pixel from the smoke source
              float dist = distance(smokeSource.xy,gl_FragCoord.xy);
              //Get the color of the current pixel
              gl_FragColor = texture2D( bufferTexture, pixel );

              //Generate smoke when mouse is pressed
          gl_FragColor.a = 0.0;
          gl_FragColor.rgb += smokeSource.z * max(15.0-dist,0.0);

          //Generate fixed smoke (this is the little point moving around in the center)
          vec2 smokePoint = vec2(res.x/2.0+6.0*sin(2.0*time),10);
          dist = distance(smokePoint,gl_FragCoord.xy);
            gl_FragColor.rgb += 0.01 * max(9.0-dist,0.0);

              //Smoke diffuse
              float xPixel = 1.0/res.x;//The size of a single pixel
              float yPixel = 1.0/res.y;
              vec4 rightColor = texture2D(bufferTexture,vec2(pixel.x+xPixel,pixel.y));
              vec4 leftColor = texture2D(bufferTexture,vec2(pixel.x-xPixel,pixel.y));
              vec4 upColor = texture2D(bufferTexture,vec2(pixel.x,pixel.y+yPixel));
              vec4 downColor = texture2D(bufferTexture,vec2(pixel.x,pixel.y-yPixel));
              //Handle the bottom boundary
          if(pixel.y <= yPixel){
            downColor.rgb = vec3(0.0);
          }
              //Diffuse equation
              float factor = 8.0 * 0.014 * (leftColor.r + rightColor.r + downColor.r * 3.0 + upColor.r - 6.0 * gl_FragColor.r);

              //Account for low precision of texels
              float minimum = 0.003;
          if(factor >= -minimum && factor < 0.0) factor = -minimum;

          gl_FragColor.rgb += factor;

        }
`;

function scene_setup() {
  //This is the basic scene setup
  scene = new THREE.Scene();
  scene.background = null;
  //Note that we're using an orthographic camera here rather than a prespective
  camera = new THREE.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    1,
    2000,
  );
  camera.position.z = 2;

  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(width, height);
  document.getElementById("Smoke")?.appendChild(renderer.domElement);
}

var bufferScene;
var textureA;
var textureB;
var bufferMaterial;
var plane;
var bufferObject;
var finalMaterial;
var quad;

function buffer_texture_setup() {
  //Create buffer scene
  bufferScene = new THREE.Scene();
  //Create 2 buffer textures
  textureA = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter,
  });
  textureB = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter,
  });
  //Pass textureA to shader
  bufferMaterial = new THREE.ShaderMaterial({
    uniforms: {
      bufferTexture: { type: "t", value: textureA },
      res: {
        type: "v2",
        value: new THREE.Vector2(width, height),
      }, //Keeps the resolution
      smokeSource: { type: "v3", value: new THREE.Vector3(0, 0, 0) },
      time: { type: "f", value: Math.random() * Math.PI * 2 + Math.PI },
    },
    fragmentShader: fShader,
  });
  plane = new THREE.PlaneBufferGeometry(width, height);
  bufferObject = new THREE.Mesh(plane, bufferMaterial);
  bufferScene.add(bufferObject);

  //Draw textureB to screen
  finalMaterial = new THREE.MeshBasicMaterial({ map: textureB });
  quad = new THREE.Mesh(plane, finalMaterial);
  scene.add(quad);
}

//Initialize the Threejs scene
scene_setup();

//Setup the frame buffer/texture we're going to be rendering to instead of the screen
buffer_texture_setup();

//Send position of smoke source with value
var mouseDown = false;
function UpdateMousePosition(X, Y) {
  var mouseX = X;
  var mouseY = height - Y;
  bufferMaterial.uniforms.smokeSource.value.x = mouseX;
  bufferMaterial.uniforms.smokeSource.value.y = mouseY;
}
document.onmousemove = function (event) {
  UpdateMousePosition(event.clientX, event.clientY);
};

document.onmousedown = function (event) {
  mouseDown = true;
  bufferMaterial.uniforms.smokeSource.value.z = 0.1;
};
document.onmouseup = function (event) {
  mouseDown = false;
  bufferMaterial.uniforms.smokeSource.value.z = 0;
};

//Render everything!
function render() {
  requestAnimationFrame(render);

  //Draw to textureB
  renderer.render(bufferScene, camera, textureB, true);

  //Swap textureA and B
  var t = textureA;
  textureA = textureB;
  textureB = t;
  quad.material.map = textureB;
  bufferMaterial.uniforms.bufferTexture.value = textureA;

  //Update time
  bufferMaterial.uniforms.time.value += 0.01;

  //Finally, draw to the screen
  renderer.render(scene, camera);
}
render();
