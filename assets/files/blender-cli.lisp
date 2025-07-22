;;; ---------------------------------------------
;;; blender-cli.lisp - user friendly wrappers around update-blender-scene
;;; ---------------------------------------------

(load "C:/home/blender-ipc.lisp")

;;---------------------------- STACK OF PLIST ARGUMENTS -----------------------------
(defun blender-ping ()
  "Send a ping to Blender"
  (update-blender-scene '(:action "ping")))

(defun blender-create (name type &key (location '(0 0 0)) (size 1.0) (rotation '(0 0 0)))
  "Create NAME of type at LOCATION (x y z), uniform (SIZE), rotation (DEG)"
  (update-blender-scene
   `(:action "create" :object ,name
     :params (:type ,type
	      :location ,location
	      :size ,size
	      :rotation ,rotation))))

(defun blender-translate (name dx dy dz)
  "Move OBJECT name by DELTA (DX DY DZ)"
  (update-blender-scene
   `(:action "translate" :object ,name
     :params (:dx ,dx :dy ,dy :dz ,dz))))

(defun blender-rotate (name rx ry rz)
  "Rotate OBJECT name by RX RY RZ degrees"
  (update-blender-scene
   `(:action "rotate" :object ,name
     :params (:rx ,rx :ry ,ry :rz ,rz))))

(defun blender-scale (name sx sy sz)
  "Scale OBJECT name by SX SY SZ multiplication factor"
  (update-blender-scene
   `(:action "scale" :object ,name
     :params (:sx ,sx :sy ,sy :sz ,sz))))

(defun blender-color (name r g b &optional (a 1.0))
  "Color OBJECT name with RGB"
  (update-blender-scene
   `(:action "color" :object ,name
     :params (:color (,r ,g ,b ,a)))))

(defun blender-rainbow (name &key
			       ((:base_type base-type) "principled")
			       ((:roughness roughness) 0.4))
  "Apply a procedural rainbow material to OBJECT in scene"
  (update-blender-scene
   `(:action "rainbow" :object ,name
     :params (:base_type ,base-type
	      :roughness ,roughness))))

(defun blender-delete (name)
  "Deletes an object from the scene"
  (update-blender-scene
   `(:action "delete" :object ,name)))

(defun blender-particles (name &key
				 (count 1000)
				 (lifetime 50)
				 (frame-start 1)
				 (frame-end 200)
				 (velocity 1.0)
				 (location '(0 0 0))
				 (smoke	nil)
				 (fire        nil)
				 (resolution-max 64))	 
  "Add or update a particle system in Blender"
  (update-blender-scene
   `(:action "particles" :object ,name
     :params (:name ,name
	      :count ,count
	      :lifetime ,lifetime
	      :frame_start ,frame-start
	      :frame_end ,frame-end
	      :velocity ,velocity
	      :location ,location
	      :smoke ,smoke
	      :fire ,fire
	      :resolution_max ,resolution-max))))

(defun blender-light (name type &key
				  (location '(0 0 0))
				  (energy 1000)
				  source
				  radius
				  angle
				  blend)
  "Add a light of type (POINT/SUN/SPOT/AREA) at LOCATION with ENERGY"
  (update-blender-scene
   `(:action "light" :object ,name
     :params (:type ,type
	      :location ,location
	      :energy ,energy
	      ;; Only splice if non-nil
	      ,@(when source (list :source source))
	      ,@(when radius (list :radius radius))
	      ,@(when angle (list :angle angle))
	      ,@(when blend (list :blend blend))))))

(defun blender-add-camera (name &key
				  (location '(0 0 0))
				  (rotation '(0 0 0)))
  "Add a CAMERA named NAME at LOCATION with ROTATION"
  (update-blender-scene
   `(:action "add-camera" :object ,name
     :params (:location ,location
	      :rotation ,rotation))))

(defun blender-set-camera (name)
  "Make an existing camera the active scene camera"
  (update-blender-scene
   `(:action "set-camera" :object ,name)))

(defun blender-emission (name &key (color '(1.0 1.0 1.0 1.0))
				(strength 1.0))
  "Give OBJECT NAME a pure emission material of COLOR (RGBA)"
  (update-blender-scene
   `(:action "emission" :object ,name
     :params (:color ,color
	      :strength ,strength))))

(defun blender-object-info (name)
  "Gets the information for the object (translation and rotation) specified in the payload"
  (update-blender-scene
   `(:action "get-info" :object ,name)))

(defun blender-material (name type &key
				     color 
				     (roughness 0.4)
				     (anisotropy 0.5)
				     (scale 0.1)
				     radius)	     				     
  "Assign a material of TYPE on NAME with the given parameters."
  (update-blender-scene
   `(:action "material" :object ,name
     :params (
              :type       ,type
	      ,@(when color (list :color color))
	      :roughness  ,roughness
	      :anisotropy ,anisotropy
	      :scale      ,scale
	      ,@(when radius (list :radius radius))))))

(defun blender-animate (name prop &key
				    (start_frame 1)
				    (end_frame 60)
				    (start_value '(0 0 0))
				    (end_value '(0 0 0)))
  "Animate NAME'S PROPERTY from START_VALUE to END_VALUE over START_FRAME -> END_FRAME."
  (update-blender-scene
   `(:action "animate" :object ,name
     :params (:property       ,prop
	      :start_frame    ,start_frame
	      :end_frame      ,end_frame
	      :start_value    ,start_value
	      :end_value      ,end_value))))

					;---------------------------------------------------------------------------------------

(defun blender-menu ()
  "Interactive menu for Blender Commands via the socket-based helper"
  (format t "~&==== BLENDER-CLI MENU =====~%")
  (format t "Reminder: Please open your Blender Host and Port to connection before running payloads~%")
  (format t "1) Ping~%2) Create Object~%3) Translate~%4) Rotate~%5) Scale~%6) Color~%7) Add Emission (+ Color)~%8) Apply Material~%9) Add Animation~%10) Add Particle System~%11) Add Light~%12) Add Camera~%13) Set Camera~%14) Delete Object~%15) Get Information~%16) Quit~%")
  (loop
    ;; Enter the REPL loop
    (format t "~%Choice: ")
    (force-output) ; (force-output): ensures the prompt appears immediately, and emptys any internal buffers
    ;; Reads the numeric option, from keyboard input
    (case (read)
      ;; 1) Ping check!
      (1
       (blender-ping))
      
      ;; 2) Create: gather parameters for object creation
      (2
       (format t "~%======== CREATING OBJECT... ==========~%")
       ;; Prompt for primitive type
       (format t "Available Meshes:~%")
       (format t "~%Cube~%Sphere~%Cylinder~%Torus~%Plane~%")
       (let ((type
	       (loop
		 (format t "~%Please type in the mesh you wish to create: ") (force-output)
		 (let ((choice (string-downcase (read-line))))
		   (if (member choice '("cube" "sphere" "cylinder" "torus" "plane")
			       :test #'string=)
		       (return choice)
		       (format t "'~A' is not a valid mesh. Please try again.~%" choice))))))
	 (format t "How many ~A(s) would you like to create: " (string-capitalize type)) (force-output)
	 (let ((num-times (read)))
	   (loop for i from 1 to num-times do
	     (format t "======== Creating ~A #~D... ========~%" (string-capitalize type) i)
	     (format t "Name: ") (force-output)
	     (let ((name (read-line)))
	       ;; Prompt for location vector
	       (format t "Location (x y z): ") (force-output)
	       (let ((location (read)))   ; a list of three numbers
		 ;; Prompt uniform size
		 (format t "Size: ") (force-output)
		 (let ((size (read)))
		   ;; Prompt rotation angles in degrees
		   (format t "Rotation (Deg) (x y z): ") (force-output)
		   (let ((rotation (read)))
		     ;; Dispatch the information to the helper
		     (blender-create name type
				     :location location
				     :size size
				     :rotation rotation)
		     (format t "~%Check your Blender Scene.~%")))))))))
      
      ;; Translate: move an existing object by deltas
      (3
       (format t "~%======== TRANSLATING OBJECT... ==========~%")
       (format t "Name: ") (force-output)
       (let ((name (read-line)))
         (format t "Translate (x y z): ") (force-output)
         (let ((deltas (read)))  ; a list (dx dy dz)
           (destructuring-bind (dx dy dz) deltas
             (blender-translate name dx dy dz))
	   (format t "~%Check your Blender Scene.~%"))))
      
      ;; 4) Rotate: rotate an existing object by Euler angles
      (4
       (format t "~%======== ROTATING OBJECT... ==========~%")
       (format t "Name: ") (force-output)
       (let ((name (read-line)))
         (format t "Rotation (in degrees) (x y z): ") (force-output)
         (let ((rots (read)))
           (destructuring-bind (rx ry rz) rots
             (blender-rotate name rx ry rz))
	   (format t "~%Check your Blender Scene.~%"))))
      
      ;; 5) Scale: scale object along each axis
      (5
       (format t "~%======== SCALING OBJECT... ==========~%")
       (format t "Name: ") (force-output)
       (let ((name (read-line)))
	 (format t "~%Careful for 0 values, always have a 1 in each value to avoid disappearance of object~%")
         (format t "Scale (x y z): ") (force-output)
         (let ((scales (read)))
           (destructuring-bind (sx sy sz) scales
             (blender-scale name sx sy sz))
	   (format t "~%Check your Blender Scene.~%"))))
      
      ;; 6) Color: set the material object base color
      (6
       (format t "~%======== APPLYING COLOR TO OBJECT... ==========~%")
       (format t "Name: ") (force-output)
       (let ((name (read-line)))
	 (format t "Apply Rainbow? (Y/N): ") (force-output)
         (let ((ans (string-upcase (read-line))))
	   (cond
	     ((string= ans "Y")
	      (format t "Shader for rainbow:~%")
	      (format t "~%Principled~%Glass~%Glossy~%Metallic~%Anisotropic~%SSS (Subsurface Scattering)~%Transparent~%Sheen~%Wireframe~%")
	      (format t "~%Please input the material you wish to add to ~A: " name)
	      (force-output)
	      (let ((st (string-downcase (read-line))))
		(format t "Roughness (0-1): ")
		(force-output)
		(let ((rough (read)))
		  (blender-rainbow name :base_type st :roughness rough))))
	     (t
	      (format t "Solid Color (r g b (alpha)): ") (force-output)
	      (let ((cols (read)))
		(destructuring-bind (r g b &optional a) cols
		  (blender-color name r g b a))))))
	 (format t "~%Check your Blender Scene.~%")))
      
      ;; 7) Emission:  Adds Emission and a Color to the given object
      (7
       (format t "~%======== APPLYING EMISSIONS TO OBJECT ==========~%")
       (format t "Name: ") (force-output)
       (let ((name (read-line)))
	 (format t "Color (r g b [a]): ") (force-output)
	 (let ((col (read)))
	   (format t "Strength (Intensity): ") (force-output)
	   (let ((str (read)))
	     (destructuring-bind (r g b &optional a) col
	       (blender-emission name
				 :color (list r g b (or a 1.0))
				 :strength str))
	     (format t "~%Check your Blender Scene.~%")))))

      ;; 8) Material: Applies a given material to an object
      (8
       (format t "~%======== APPLYING MATERIAL TO OBJECT ==========~%")
       (format t "Name: ") (force-output)
       (let ((name (read-line)))
	 (format t "Material Type:~%")
	 (format t "~%Principled~%Glass~%Glossy~%Metallic~%Anisotropic~%SSS (Subsurface Scattering)~%Transparent~%Sheen~%Wireframe~%")
	 (format t "~%Please input the material you wish to add to ~A: " name)
	 (force-output)
	 (let ((type (string-downcase (read-line))))
	   ;; Ask if they want to reuse the color from the object
	   (format t "Use existing object color? (Y/N): ") (force-output)
	   (let ((keep (string-upcase (read-line))))
	     (cond
	       ;; -------------------------- PRESERVING COLOR -----------------------
	       ((string= keep "Y")
		;; Keep color: calling without :color
		(cond
		  ((string= type "anisotropic")
		   (format t "Roughness (0.0 - 1.0): ") (force-output)
		   (let ((rough (read)))
		     (format t "Anisotropy (0.0 - 1.0): ") (force-output)
		     (let ((ani (read)))
		       (blender-material name type
					 :roughness rough
					 :anisotropy ani))))
		  ;; Principled, Glass, Glossy, Metallic all need roughness
		  ((member type '("principled" "glass" "glossy" "metallic")
			         :test #'string=)
		   (format t "Roughness (0.0-1.0): ") (force-output)
		   (let ((rough (read)))
		     (blender-material name type
				       :roughness rough)))

		  ;; Subsurface scattering
		  ((string= type "sss")
		   (format t "Scale: ") (force-output)
		   (let ((sc (read)))
		     (format t "Radius (r g b): ") (force-output)
		     (let ((rad (read)))
		       (blender-material name type
					 :scale sc
					 :radius rad))))

		  ;; Velvet
		  ((string= type "sheen")
                   (format t "Roughness: ") (force-output)
		   (let ((rough (read)))
		     (blender-material name type
				       :roughness rough)))
		  (t
		   ;; Transparent, Wireframe, or any other non-shader parameter
		   (blender-material name type))))

	       ;; ---------------------- Ask for new Color -------------------
	       ((string= keep "N")
		(format t "Color (r g b [a]): ") (force-output)
		(let* ((cols (read))
		       (color (if (= (length cols) 3) (append cols '(1.0)) cols)))
		  (cond
		    ((string= type "anisotropic")
		     (format t "Roughness (0.0 - 1.0): ") (force-output)
		     (let ((rough (read)))
		       (format t "Anisotropy (0.0 - 1.0): ") (force-output)
		       (let ((ani (read)))
			 (blender-material name type
					   :color color
					   :roughness rough
					   :anisotropy ani))))
		    ((member type '("principled" "glass" "glossy" "metallic")
			          :test #'string=)
		     (format t "Roughness (0.0-1.0): ") (force-output)
		     (let ((rough (read)))
		       (blender-material name type
					 :color color
					 :roughness rough)))
		    ((string= type "sss")
		     (format t "Scale: ") (force-output)
		     (let ((sc (read)))
		       (format t "Radius (r g b): ") (force-output)
		       (let ((rad (read)))
			 (blender-material name type
					   :color color
					   :scale sc
					   :radius rad))))
		    
		    ((string= type "sheen")
                     (format t "Roughness: ") (force-output)
		     (let ((rough (read)))
		       (blender-material name type
					 :color color
					 :roughness rough)))
		    (t
		     (blender-material name type :color color)))))
	       (t
		(format t "Invalid choice - Keeping existing color by default.~%")
		(blender-material name type))))
	   (format t "~%Check your Blender Scene.~%"))))

      ;; 9) Animate: Animates a given object given the interpolation, start and end values and frames
      (9
       (format t "~%======== ANIMATING OBJECT... ==========~%")
       (format t "Name: ") (force-output)
       (let ((name (read-line)))
	 (format t "Property:~%")
	 (format t "location~%rotation_euler~%scale~%")
	 (let ((prop
	   (loop
	     (format t "Please input a property exactly as shown from the above: ") (force-output)
	     (let ((choice (string-downcase (read-line))))
	       (if (member choice '("location" "rotation_euler" "scale")
			   :test #'string=)
		   (return choice)
		   (format t "'~A' is not a valid property.~%" choice))))))
	 (format t "Start frame: ") (force-output)
	 (let ((sf (read-line)))
	   (format t "End frame: ") (force-output)
	   (let ((ef (read-line)))
	     (format t "Start Value (x y z): ") (force-output)
	     (let ((sv (read)))
	       (format t "End Value (x y z): ") (force-output)
	       (let ((ev (read)))
		 (blender-animate name prop
				  :start_frame sf
				  :end_frame ef
				  :start_value sv
				  :end_value ev)
		 (format t "~%Check your Blender Scene.~%"))))))))
      
      ;; 10) Particles: Creates a particle system or updates an existing one in Blender Scene
      (10
       (format t "~%======== ADDING OR UPDATING PARTICLE SYSTEMS... ==========~%")
       (format t "Name: ") (force-output)
       (let ((name (read-line)))
	 (format t "Count: ") (force-output)
	 (let ((count (read)))
	   (format t "Lifetime: ") (force-output)
	   (let ((lifetime (read)))
	     (format t "Frame Start: ") (force-output)
	     (let ((frame-start (read)))
	       (format t "Frame End: ") (force-output)
	       (let ((frame-end (read)))
		 (format t "Velocity: ") (force-output)
		 (let ((velocity (read)))
		   (format t "Location (x y z): ") (force-output)
		   (let ((location (read)))
		     (format t "Do you want to bring the smoke? (Y/N): ") (force-output)
		     (let ((smoke (string= "Y" (string-upcase (read-line)))))
		       (format t "And also the fire? (Y/N): ") (force-output)
		       (let ((fire (string= "Y" (string-upcase (read-line)))))
			 (format t "Domain resolution (e.g. 64): ") (force-output)
			 (let ((res-max (read)))
			   
			   ;; Dispatch the information to the helper
			   (blender-particles name
					      :count count
					      :lifetime lifetime
					      :frame-start frame-start
					      :frame-end frame-end
					      :velocity velocity
					      :location location
					      :smoke smoke
					      :fire fire
					      :resolution-max res-max)
			   (format t "~%Check your Blender Scene.~%"))))))))))))

      ;; 11) Light: Creates and places a light on the global scene
      (11
       (format t "~%======== CREATING LIGHT SOURCE... ==========~%")
       (format t "Name: ") (force-output)
       (let ((name (read-line))
	     (location nil)
	     (energy   nil)
	     (radius   nil)
	     (angle    nil)
	     (blend    nil))
         (format t "Type:~% ~%POINT~%SUN~%SPOT~%AREA ") (force-output)
	 (let ((type
		 (loop
		   (format t "~%Please enter the type of light source you wish to create: ") (force-output)
		   (let ((choice (string-upcase (read-line))))
		     (if (member choice '("POINT" "SUN" "SPOT" "AREA")
				 :test #'string=)
			 (return choice)
			 (format t "'~A' is not a valid light source. Please try again." choice))))))
	   
	   (format t "Location (x y z): ") (force-output)
	   (setf location (read))
	   
	   (format t "Energy: ") (force-output)
	   (setf energy (read))

           ;; Prompt for angle and blend for SPOT light only
	   (when (string= (string-upcase type) "SPOT")
	     (format t "~%===== FOR SPOT LIGHT ONLY... ========~%")
	     (format t "Angle (degrees): ") (force-output)
	     (setf angle (read))
	     (format t "Blend (0 - 1): ") (force-output)
	     (setf blend (read)))
	 
	   (format t "Link to meshes within a specific radius? (Y/N): ") (force-output)
	   (when (string= (string-upcase (read-line)) "Y")
	     (format t "Radius (Blender Units): ") (force-output)
	     (setf radius (read)))
	   (blender-light name type
			  :location location
			  :energy energy
			  :angle angle
			  :blend blend
			  :radius radius)
	   (format t "~%Check your Blender Scene.~%"))))

      ;; 12) Add Camera: Adds a camera and applies to the location and rotation given in the payload
      (12
       (format t "~%======== ADDING CAMERA... ==========~%")
       (format t "Name: ") (force-output)
       (let ((name (read-line)))
	 (format t "Location (x y z): ") (force-output)
	 (let ((location (read)))
	   (format t "Rotation: (deg x y z): ") (force-output)
	   (let ((rotation (read)))
	     (blender-add-camera name
				 :location location
				 :rotation rotation)
	     (format t "~%Check your Blender Scene.~%")))))

      ;; 13) Set Camera: Sets the active camera
      (13
       (format t "~%======== SETTING CAMERA... ==========~%")
       (format t "Camera to activate: ") (force-output)
       (let ((name (read-line)))
	 (blender-set-camera name)
	 (format t "~%Check your Blender Scene.~%")))
      
      ;; 14) Delete: remove an object from the scene
      (14
       (format t "~%======== DELETING OBJECT... ==========~%")
       (format t "Name to delete (or press Enter to delete ALL): ") (force-output)
       (let ((name (read-line)))
	 ;; If the user typed something just delete that object
	 (unless (string= name "")
	   (blender-delete name)
	   (format t "~%Check your Blender Scene~%"))

	 (when (string= name "")
	   (format t "Are you sure you want to delete ALL objects? (Y/N): ") (force-output)
	   (let ((ans (string-upcase (read-line))))
	     (when (string= ans "Y")
	       ;; Inside the Python handles nil arguments
	       (blender-delete nil)
	       (format t "~%Check your Blender Scene~%"))))))

      ;; 15) Retrieves the object's location and rotation and puts it in the System Console in Blender
      (15
       (format t "~%======== RETRIEVING INFORMATION... ==========~%")
       (format t "Name of object (or press enter to retrieve all objects in scene): ") (force-output)
       (let ((name (read-line)))
	 (blender-object-info name)))
      
      ;; 16) Quit: Exit the loop
      (16
       (format t "Goodbye.~%")
       (return))
      (otherwise
       (format t "Invalid Choice~%")))))
