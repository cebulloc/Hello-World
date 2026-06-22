import os, sys
import pyFlightscript as FS

#Open FlightStream on exmaine remote desktop
fsexe_path = r'D:\FlightStream\v2026-FlightStream_installation\FlightStream_26_0.exe'

#Universal simulation setup
FS.script.hard_reset()

#Loop through AoA and orientations
for i in range(-2,6): #Loop through AoA
       for j in range(-3,4): #Loop through blade pitch j*15
              for k in range(5,14): #loop through advance ratios k/10

                     #Open simulation
                     FS.fsinit.new_simulation()
                     FS.fsinit.open_fsm(r'G:\Examine-Users\awartenb\Desktop\FlightStreamFiles\NonOfficialGeometryFiles\SlowedRotorReversalTests\Inputs\BaseGeometry.fsm')

                     #Have trailing edges setup before starting

                     #Geometry opening and edits
                     FS.mesh.surface_rotate(frame=2, axis='X', angle=j*15, surfaces=[2],
                            split_vertices='DISABLE', adaptive_mesh='DISABLE',
                            detach_normal_to_axis='DISABLE')
                     FS.mesh.surface_rotate(frame=3, axis='X', angle=j*15, surfaces=[3],
                            split_vertices='DISABLE', adaptive_mesh='DISABLE',
                            detach_normal_to_axis='DISABLE')
                     FS.mesh.surface_rotate(frame=4, axis='X', angle=j*15, surfaces=[1],
                            split_vertices='DISABLE', adaptive_mesh='DISABLE',
                            detach_normal_to_axis='DISABLE')
                     FS.unite.boolean_unite_mesh(-1, bodies_info=None)
                     FS.mesh.surface_rotate(frame=1, axis='Y', angle=i, surfaces=[1,2,3,4],
                            split_vertices='DISABLE', adaptive_mesh='DISABLE',
                            detach_normal_to_axis='DISABLE')
                     FS.csys.rotate_coordinate_system(frame=5, rotation_frame=1,
                                          rotation_axis='Y', angle=i)

                     #Unsteady motion settings
                     w = (44.76/(0.8654*(k/10)))
                     FS.motion.create_new_motion_euclidean()
                     FS.motion.set_motion_boundaries(1, 4, [1,2,3,4])
                     FS.motion.set_motion_moving_frames(1, 1, frames_list=[5])
                     FS.motion.set_motion_coordinate_system(1, 5)
                     FS.motion.set_motion_angular_velocity(1, 0, 0, w)
                     FS.motion.set_motion_is_rotor(1, flag='ENABLE', axis='Z')
                     FS.set_solver.unsteady_solver_new_force_plot(frame=1, units='NEWTONS', parameter='FORCE_Z',
                                          name='Lift', boundaries=4, boundary_indices=[1,2,3,4])
                     FS.set_solver.unsteady_solver_new_force_plot(frame=1, units='NEWTONS', parameter='FORCE_X',
                                          name='Drag', boundaries=4, boundary_indices=[1,2,3,4])

                     #dt, step size, and n, number of unsteady iterations, change with angular velocity w
                     dt = (0.139626/w)
                     n = int(((6*3.1415926535)/w)/dt)
                     FS.set_solver.unsteady(n, dt)

                     #Solver settings
                     FS.wake.detect_wake_termination_nodes_by_surface(surface_id=1)
                     FS.wake.detect_wake_termination_nodes_by_surface(surface_id=2)
                     FS.wake.detect_wake_termination_nodes_by_surface(surface_id=3)
                     FS.wake.detect_wake_termination_nodes_by_surface(surface_id=4)
                     FS.freestream.air_altitude(altitude=3500)
                     FS.set_solver.velocity(velocity=44.76)
                     FS.set_solver.set_solver_model(model_type='INCOMPRESSIBLE')
                     FS.set_solver.boundary_layer_type(type_value='TURBULENT')
                     FS.set_solver.viscous_coupling(mode='ENABLE')
                     FS.set_solver.set_axial_separation_boundaries([1,2,3,4])
                     FS.set_solver.solver_settings(angle_of_attack=0, sideslip_angle=0.,
                            freestream_velocity=44.76, iterations=1000,
                            convergence_limit=5e-4, forced_run='DISABLE',
                            compressibility='DISABLE', reference_velocity=44.76,
                            reference_area=0.2371, reference_length=0.0969264, processors=20,
                            wake_size=1000)
                     FS.solver.initialize_solver(-1, 1, symmetry_periodicity=1,
                                   proximity_avoidance='ENABLE', stabilization='ENABLE', stabilization_strength=1.0,
                                   fast_multipole='ENABLE', wake_termination_x='DEFAULT', symmetry_type='NONE')
                     FS.exec_solver.start_solver()
                     FS.export_data.export_solver_analysis_spreadsheet(rf'G:\Examine-Users\awartenb\Desktop\FlightStreamFiles\NonOfficialGeometryFiles\SlowedRotorReversalTests\OutputFiles\Test{i},{j*15},{k/10}.txt')
                     FS.set_solver.unsteady_solver_export_plots(rf'G:\Examine-Users\awartenb\Desktop\FlightStreamFiles\NonOfficialGeometryFiles\SlowedRotorReversalTests\OutputFiles\PlotData{i},{j*15},{k/10}.txt')
                     FS.solver.solver_uninitialize()
                     FS.mesh.surface_rotate(frame=1, axis='Y', angle=-i, surfaces=[1,2,3,4],
                            split_vertices='DISABLE', adaptive_mesh='DISABLE',
                            detach_normal_to_axis='DISABLE')
                     FS.csys.rotate_coordinate_system(frame=5, rotation_frame=1,
                                   rotation_axis='Y', angle=-i)

#Generates and runs the script that was detialed above
FS.script.write_to_file()
FS.script.run_script(fsexe_path = fsexe_path)
